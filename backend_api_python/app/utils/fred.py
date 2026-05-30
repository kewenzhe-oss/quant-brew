"""
FRED Data Utility — dual-mode transport.

Priority order:
  1. FRED Official JSON API (api.stlouisfed.org) — requires FRED_API_KEY in .env
     Free key: https://fred.stlouisfed.org/docs/api/api_key.html  (instant, no credit card)
  2. FRED public CSV endpoint (fred.stlouisfed.org/graph/fredgraph.csv)
     No key required, but frequently blocked / geo-restricted.

If neither works, returns status="error" so the fallback pipeline can use
a Yahoo Finance source or cached snapshot instead.
"""
import time
import pandas as pd
import requests
import io
import os
import threading
from typing import Dict, Any, List
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Prevent concurrent threads from flooding FRED API simultaneously
_fred_lock = threading.Lock()
_last_request_time = 0.0

# ---------------------------------------------------------------------------
# Shared transport helpers
# ---------------------------------------------------------------------------

def _get_proxies() -> dict:
    proxies = {}
    if os.getenv("HTTP_PROXY"):
        proxies["http"] = os.getenv("HTTP_PROXY")
        proxies["https"] = os.getenv("HTTPS_PROXY", os.getenv("HTTP_PROXY"))
    elif os.getenv("PROXY_URL"):
        proxies["http"] = os.getenv("PROXY_URL")
        proxies["https"] = os.getenv("PROXY_URL")
    return proxies


def _apply_mode(series: pd.Series, mode: str) -> pd.Series:
    if mode == "yoy":
        return series.pct_change(periods=12) * 100
    if mode == "diff":
        return series.diff()
    return series


# ---------------------------------------------------------------------------
# Strategy 1: Official FRED JSON API (api.stlouisfed.org)
# ---------------------------------------------------------------------------

def _fetch_via_api(series_id: str, mode: str, limit: int = 200) -> Dict[str, Any]:
    """
    Fetch using the official FRED REST API.
    Requires FRED_API_KEY env var (free: https://fred.stlouisfed.org/docs/api/api_key.html).

    For scalar fetches (limit <= 200): uses sort_order=desc so we always get the
    MOST RECENT data first (avoids returning data from the 1970s for old series).
    For timeseries fetches (limit > 200): uses sort_order=asc to return full history.
    """
    global _last_request_time

    from app.config.api_keys import APIKeys
    api_key = APIKeys.FRED_API_KEY.strip()
    if not api_key:
        raise ValueError("FRED_API_KEY not configured")

    # Scalar mode: fetch recent data descending so iloc[-1] is the latest.
    # We need enough rows for transforms: 15 for yoy (12 periods), 3 for diff, 1 for raw.
    is_timeseries = limit > 200
    if is_timeseries:
        sort_order = "asc"
        actual_limit = limit
    else:
        sort_order = "desc"
        actual_limit = 15 if mode == "yoy" else (3 if mode == "diff" else 5)

    url = (
        f"https://api.stlouisfed.org/fred/series/observations"
        f"?series_id={series_id}&api_key={api_key}"
        f"&file_type=json&sort_order={sort_order}&limit={actual_limit}"
    )
    proxies = _get_proxies()

    with _fred_lock:
        # Rate limit spacing: ensure at least 250ms between requests
        now = time.time()
        elapsed = now - _last_request_time
        if elapsed < 0.25:
            time.sleep(0.25 - elapsed)
        _last_request_time = time.time()

        # Retry with exponential backoff on 429
        for attempt in range(4):
            resp = requests.get(url, proxies=proxies, timeout=15)
            if resp.status_code == 429 and attempt < 3:
                sleep_time = 2 ** attempt
                logger.warning(f"[FRED] 429 rate-limit for {series_id}, retrying in {sleep_time}s... (attempt {attempt+1}/4)")
                time.sleep(sleep_time)
                _last_request_time = time.time()
                continue
            resp.raise_for_status()
            break

    data = resp.json()

    if "error_code" in data:
        raise ValueError(f"FRED API error: {data.get('error_message')}")

    observations = data.get("observations", [])
    if not observations:
        raise ValueError(f"No observations returned for {series_id}")

    # Build a DataFrame — skip FRED's '.' missing-data marker
    rows = []
    for obs in observations:
        try:
            val = float(obs["value"])
            rows.append({"observation_date": obs["date"], "value": val})
        except (ValueError, KeyError):
            pass

    if not rows:
        raise ValueError(f"All observations are missing/invalid for {series_id}")

    df = pd.DataFrame(rows)

    # For descending scalar fetch: reverse so oldest→newest for pct_change/diff to work
    if not is_timeseries:
        df = df.iloc[::-1].reset_index(drop=True)

    df["calculated_val"] = _apply_mode(df["value"], mode)
    df = df.dropna(subset=["calculated_val"])

    if df.empty:
        raise ValueError(f"No valid data after mode={mode} transform for {series_id}")

    latest = df.iloc[-1]
    return {
        "value": float(latest["calculated_val"]),
        "asOf": str(latest["observation_date"]),
        "source": "FRED",
        "seriesId": series_id,
        "status": "ok",
        "error": None,
        "_raw_df": df,  # used by timeseries variant
    }


# ---------------------------------------------------------------------------
# Strategy 2: FRED public CSV (no key, but often geo-blocked)
# ---------------------------------------------------------------------------

def _fetch_via_csv(series_id: str, mode: str) -> Dict[str, Any]:
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
    proxies = _get_proxies()
    resp = requests.get(url, proxies=proxies, timeout=20)
    resp.raise_for_status()

    df = pd.read_csv(io.StringIO(resp.text))
    value_col = next((c for c in df.columns if c != "observation_date"), None)
    if value_col is None or df.empty:
        raise ValueError("Data column not found in CSV")

    df = df.dropna(subset=[value_col])
    df[value_col] = pd.to_numeric(df[value_col], errors="coerce")
    df = df.dropna(subset=[value_col])
    df["calculated_val"] = _apply_mode(df[value_col], mode)
    df = df.dropna(subset=["calculated_val"])

    if df.empty:
        raise ValueError("No valid numeric data in CSV after transform")

    latest = df.iloc[-1]
    return {
        "value": float(latest["calculated_val"]),
        "asOf": str(latest["observation_date"]),
        "source": "FRED",
        "seriesId": series_id,
        "status": "ok",
        "error": None,
        "_raw_df": df,
    }


# ---------------------------------------------------------------------------
# Public: fetch_fred_series  (scalar — latest value only)
# ---------------------------------------------------------------------------

def fetch_fred_series(series_id: str, mode: str = None) -> Dict[str, Any]:
    """
    Fetch the latest valid numeric value for a FRED series.

    Tries the official FRED JSON API first (requires FRED_API_KEY), then falls
    back to the public CSV endpoint. Returns a standardized dict.

    If mode='yoy': Year-over-Year percentage change (monthly series).
    If mode='diff': Absolute difference from prior period.
    """
    result = {
        "value": None,
        "asOf": None,
        "source": "FRED",
        "seriesId": series_id,
        "status": "error",
        "error": "Unknown error",
    }
    logger.debug(f"Fetching FRED series: {series_id} (mode={mode})")

    # --- Strategy 1: Official API ---
    try:
        res = _fetch_via_api(series_id, mode)
        result.update(res)
        result.pop("_raw_df", None)
        logger.info(f"[FRED] {series_id} resolved via official API → {result['value']} as of {result['asOf']}")
        return result
    except Exception as e:
        logger.warning(f"[FRED] Official API failed for {series_id}: {e} — trying CSV fallback")

    # --- Strategy 2: Public CSV ---
    try:
        res = _fetch_via_csv(series_id, mode)
        result.update(res)
        result.pop("_raw_df", None)
        logger.info(f"[FRED] {series_id} resolved via CSV → {result['value']} as of {result['asOf']}")
        return result
    except Exception as e:
        logger.error(f"[FRED] Both strategies failed for {series_id}: {e}")
        result["error"] = str(e)

    return result


# ---------------------------------------------------------------------------
# Public: fetch_fred_timeseries  (full historical list)
# ---------------------------------------------------------------------------

def fetch_fred_timeseries(series_id: str, mode: str = None) -> List[Dict]:
    """
    Fetch full historical data for a FRED series.
    Returns [{\"time\": \"YYYY-MM-DD\", \"value\": float}, ...]
    Tries official API then CSV fallback.
    """
    logger.debug(f"Fetching FRED timeseries: {series_id} (mode={mode})")

    def _build_series(df: pd.DataFrame) -> List[Dict]:
        rows = []
        for _, row in df.iterrows():
            val = row["calculated_val"]
            if val is not None and not pd.isna(val):
                rows.append({
                    "time": str(row["observation_date"]),
                    "value": float(val),
                })
        return rows

    # Strategy 1: Official API (request more history: up to 100k observations)
    try:
        res = _fetch_via_api(series_id, mode, limit=100000)
        df = res.get("_raw_df")
        if df is not None and not df.empty:
            return _build_series(df)
    except Exception as e:
        logger.warning(f"[FRED timeseries] Official API failed for {series_id}: {e}")

    # Strategy 2: CSV
    try:
        res = _fetch_via_csv(series_id, mode)
        df = res.get("_raw_df")
        if df is not None and not df.empty:
            return _build_series(df)
    except Exception as e:
        logger.error(f"[FRED timeseries] Both strategies failed for {series_id}: {e}")

    return []
