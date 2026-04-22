"""
Fed balance sheet liquidity fetcher.

Fetches WALCL, TGA (WTREGEN), and RRP (RRPONTSYD) from FRED.
Computes net US liquidity: WALCL - TGA - RRP

All three series are weekly (Wednesday), reported in billions USD.
FRED ticker mappings:
  WALCL    = Fed total assets (billions USD)
  WTREGEN  = Treasury General Account at Federal Reserve (billions USD)
  RRPONTSYD = Overnight Reverse Repurchase Agreements (billions USD)

Fetch strategy (ordered):
  1. yfinance FRED ticker — fast, but broken as of 2026-04 (HTTP 404)
  2. FRED direct CSV API  — no API key required, reliable fallback
"""

from __future__ import annotations

import logging
from typing import Any, Dict

import requests

logger = logging.getLogger(__name__)

# yfinance FRED tickers
_WALCL_TICKER    = "WALCL"
_TGA_TICKER      = "WTREGEN"
_RRP_TICKER      = "RRPONTSYD"

# Direct FRED CSV base URL (no API key needed)
_FRED_CSV_BASE   = "https://fred.stlouisfed.org/graph/fredgraph.csv?id="
_FRED_HEADERS    = {"User-Agent": "Mozilla/5.0 (compatible; QuantBrew/1.0)"}


def _fetch_fred_yfinance(ticker_symbol: str, label: str) -> float | None:
    """Fetch the latest value of a FRED series via yfinance. Returns None on failure."""
    try:
        import yfinance as yf
        ticker = yf.Ticker(ticker_symbol)
        hist = ticker.history(period="30d")  # FRED weekly — need recent window
        if hist is not None and not hist.empty:
            value = float(hist["Close"].iloc[-1])
            logger.info("FRED yfinance %s (%s): %.2f B", ticker_symbol, label, value)
            return value
        else:
            logger.warning("FRED yfinance %s (%s): empty history", ticker_symbol, label)
            return None
    except Exception as e:
        logger.error("FRED yfinance %s (%s) fetch failed: %s", ticker_symbol, label, e)
        return None


def _fetch_fred_direct(series_id: str, label: str) -> float | None:
    """
    Fallback: fetch FRED series via direct CSV API (no API key needed).
    Returns the most recent non-null value, or None on failure.
    """
    try:
        url = f"{_FRED_CSV_BASE}{series_id}"
        resp = requests.get(url, timeout=20, headers=_FRED_HEADERS)
        if resp.status_code != 200:
            logger.warning("FRED direct %s HTTP %d", series_id, resp.status_code)
            return None

        lines = resp.text.strip().split("\n")
        # Find last non-empty, non-header, non-dot line
        last_val = None
        for line in reversed(lines):
            line = line.strip()
            if not line or line.startswith("DATE") or line.endswith("."):
                continue
            parts = line.split(",")
            if len(parts) == 2:
                try:
                    last_val = float(parts[1].strip())
                    logger.info("FRED direct %s (%s): %.2f", series_id, label, last_val)
                    break
                except ValueError:
                    continue

        return last_val
    except requests.exceptions.Timeout:
        logger.error("FRED direct %s timeout", series_id)
        return None
    except Exception as e:
        logger.error("FRED direct %s failed: %s", series_id, e)
        return None


def _fetch_fred_series(ticker_symbol: str, label: str) -> float | None:
    """
    Fetch a FRED series with automatic fallback:
      1. yfinance (fast, sometimes broken)
      2. FRED direct CSV API (reliable fallback, no key needed)
    """
    value = _fetch_fred_yfinance(ticker_symbol, label)
    if value is None:
        logger.info("yfinance failed for %s, falling back to FRED direct CSV", ticker_symbol)
        value = _fetch_fred_direct(ticker_symbol, label)
    return value


def fetch_fed_liquidity() -> Dict[str, Any]:
    """
    Fetch WALCL, TGA, RRP, WRESBAL, NFCI and compute net US liquidity.
    """
    walcl   = _fetch_fred_series(_WALCL_TICKER, "Fed Assets")
    tga     = _fetch_fred_series(_TGA_TICKER,   "Treasury General Account")
    rrp     = _fetch_fred_series(_RRP_TICKER,   "Overnight RRP")
    wresbal = _fetch_fred_series("WRESBAL",     "Bank Reserves")
    nfci    = _fetch_fred_series("NFCI",        "Financial Conditions Index")

    available = sum(x is not None for x in [walcl, tga, rrp])

    if available == 3:
        net = walcl - tga - rrp
        quality = "real"
    elif available > 0:
        net = (walcl or 0.0) - (tga or 0.0) - (rrp or 0.0)
        quality = "partial"
    else:
        net = None
        quality = "unavailable"

    logger.info(
        "Fed liquidity: WALCL=%s, TGA=%s, RRP=%s, WRESBAL=%s, NFCI=%s → Net=%s (%s)",
        f"{walcl:.1f}" if walcl is not None else "None",
        f"{tga:.1f}"   if tga   is not None else "None",
        f"{rrp:.1f}"   if rrp   is not None else "None",
        f"{wresbal:.1f}" if wresbal is not None else "None",
        f"{nfci:.2f}"  if nfci  is not None else "None",
        f"{net:.1f}"   if net   is not None else "None",
        quality,
    )

    return {
        "walcl":         round(walcl, 1) if walcl is not None else None,
        "tga":           round(tga,   1) if tga   is not None else None,
        "rrp":           round(rrp,   1) if rrp   is not None else None,
        "wresbal":       round(wresbal, 1) if wresbal is not None else None,
        "nfci":          round(nfci, 2) if nfci is not None else None,
        "net_liquidity": round(net,   1) if net   is not None else None,
        "data_quality":  quality,
        "source":        "FRED API Base",
    }
