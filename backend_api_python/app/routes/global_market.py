"""
Global Market Dashboard APIs — Snapshot-Serving Layer.

All endpoints in this blueprint serve data exclusively from the pre-computed
MacroSnapshot that is periodically refreshed by the background
MacroSnapshotWorker.  No endpoint triggers a live external API call during the
user request path.

Endpoints:
- GET  /api/global-market/overview         - Global market overview (from snapshot)
- GET  /api/global-market/heatmap          - Market heatmap data (from snapshot)
- GET  /api/global-market/news             - Financial news (from snapshot)
- GET  /api/global-market/calendar         - Economic calendar (from snapshot)
- GET  /api/global-market/sentiment        - Fear & Greed / VIX / DXY (from snapshot)
- GET  /api/global-market/adanos-sentiment - Optional Adanos stock sentiment (live, per-user-param)
- GET  /api/global-market/opportunities    - Trading opportunities scanner (own cache)
- GET  /api/global-market/snapshot/status  - Snapshot freshness metadata
- POST /api/global-market/refresh          - Force immediate snapshot re-generation

Response metadata
-----------------
Every snapshot-backed response includes a ``_snapshot_meta`` envelope field:

  {
    "status":          "ready | stale | pending | degraded",
    "generated_at":    "<ISO-8601 UTC>",
    "age_seconds":     <int>,
    "stale":           <bool>,
    "missing_sections": []
  }

When the snapshot does not yet exist ``status`` is ``"pending"`` and ``data``
is ``null``.  The frontend should render a loading/skeleton state for pending
responses rather than showing an error.
"""

from __future__ import annotations

import time

from flask import Blueprint, jsonify, request

from app.utils.logger import get_logger
from app.utils.auth import login_required

# Snapshot helpers — the ONLY cache access these endpoints use.
from app.services.macro_snapshot import (
    read_macro_snapshot,
    build_pending_response,
    snapshot_meta,
)

# data_providers still needed for adanos-sentiment and opportunities which
# cannot be prewarmed generically (per-user params / large scan volume).
from app.data_providers import get_cached, set_cached, clear_cache
from app.data_providers.adanos_sentiment import fetch_adanos_market_sentiment
from app.data_providers.opportunities import (
    analyze_opportunities_crypto, analyze_opportunities_stocks,
    analyze_opportunities_local_stocks, analyze_opportunities_forex,
)

logger = get_logger(__name__)

global_market_bp = Blueprint("global_market", __name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _snapshot_response(section_key: str, data_override=None):
    """
    Build a Flask JSON response for a single section of the macro snapshot.

    If the snapshot is absent, returns a fast pending response.
    If present (ready / stale / degraded), returns the requested section.
    """
    snap = read_macro_snapshot()

    if snap is None:
        pending = build_pending_response()
        return jsonify({
            "code": 1,
            "msg": "snapshot_pending",
            "data": None,
            "_snapshot_meta": {
                "status": "pending",
                "generated_at": None,
                "age_seconds": None,
                "stale": None,
                "missing_sections": [],
            },
        })

    meta = snapshot_meta(snap)
    section_data = data_override if data_override is not None else snap.get(section_key)

    return jsonify({
        "code": 1,
        "msg": "success",
        "data": section_data,
        "_snapshot_meta": meta,
    })


# ---------------------------------------------------------------------------
# API Endpoints — Snapshot-backed (no live fetch)
# ---------------------------------------------------------------------------

@global_market_bp.route("/overview", methods=["GET"])
@login_required
def market_overview():
    """
    Global market overview — indices, forex, crypto, commodities.

    Served exclusively from the precomputed MacroSnapshot.
    """
    try:
        resp = _snapshot_response("overview")
        snap = read_macro_snapshot()
        if snap:
            logger.debug(
                "[API] /overview served from snapshot (status=%s, age=%ss)",
                snap.get("status"), snap.get("age_seconds"),
            )
        return resp
    except Exception as e:
        logger.error("market_overview failed: %s", e, exc_info=True)
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500


@global_market_bp.route("/heatmap", methods=["GET"])
@login_required
def market_heatmap():
    """
    Market heatmap data for crypto, stock sectors, forex, commodities, indices.

    Served exclusively from the precomputed MacroSnapshot.
    """
    try:
        return _snapshot_response("heatmap")
    except Exception as e:
        logger.error("market_heatmap failed: %s", e, exc_info=True)
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500


@global_market_bp.route("/news", methods=["GET"])
@login_required
def market_news():
    """
    Financial news (CN + EN).

    Served exclusively from the precomputed MacroSnapshot.
    The ``lang`` query parameter is honoured by slicing the cached payload so
    that the response shape is identical to the previous live-fetch API.
    """
    try:
        lang = request.args.get("lang", "all")
        snap = read_macro_snapshot()

        if snap is None:
            pending = build_pending_response()
            return jsonify({
                "code": 1,
                "msg": "snapshot_pending",
                "data": None,
                "_snapshot_meta": {
                    "status": "pending",
                    "generated_at": None,
                    "age_seconds": None,
                    "stale": None,
                    "missing_sections": [],
                },
            })

        news_all = snap.get("news") or {"cn": [], "en": []}
        meta = snapshot_meta(snap)

        if lang == "cn":
            data = {"cn": news_all.get("cn", []), "en": []}
        elif lang == "en":
            data = {"cn": [], "en": news_all.get("en", [])}
        else:
            data = news_all

        logger.debug(
            "[API] /news served from snapshot (lang=%s, status=%s, age=%ss)",
            lang, snap.get("status"), snap.get("age_seconds"),
        )

        return jsonify({"code": 1, "msg": "success", "data": data, "_snapshot_meta": meta})

    except Exception as e:
        logger.error("market_news failed: %s", e, exc_info=True)
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500


@global_market_bp.route("/calendar", methods=["GET"])
@login_required
def economic_calendar():
    """
    Economic calendar events.

    Served exclusively from the precomputed MacroSnapshot.
    """
    try:
        return _snapshot_response("calendar")
    except Exception as e:
        logger.error("economic_calendar failed: %s", e, exc_info=True)
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500


@global_market_bp.route("/sentiment", methods=["GET"])
@login_required
def market_sentiment():
    """
    Comprehensive market sentiment indicators — Fear & Greed, VIX, DXY,
    Yield Curve, VXN, GVZ, Put/Call ratio proxy, and U.S. Liquidity metrics.

    Served exclusively from the precomputed MacroSnapshot.
    """
    try:
        snap = read_macro_snapshot()
        if snap is None:
            pending = build_pending_response()
            return jsonify({
                "code": 1,
                "msg": "snapshot_pending",
                "data": None,
                "_snapshot_meta": {
                    "status": "pending",
                    "generated_at": None,
                    "age_seconds": None,
                    "stale": None,
                    "missing_sections": [],
                },
            })

        logger.debug(
            "[API] /sentiment served from snapshot (status=%s, age=%ss)",
            snap.get("status"), snap.get("age_seconds"),
        )
        meta = snapshot_meta(snap)
        data = snap.get("sentiment") or {}
        
        # Merge other macro dimensions so existing frontend adapters consume them transparently
        for dim in ["liquidity", "economy", "inflation_rates"]:
            dim_data = snap.get(dim)
            if dim_data:
                data = {**data, **dim_data}
            
        return jsonify({
            "code": 1,
            "msg": "success",
            "data": data,
            "_snapshot_meta": meta,
        })
    except Exception as e:
        logger.error("market_sentiment failed: %s", e, exc_info=True)
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500


# ---------------------------------------------------------------------------
# Snapshot status endpoint
# ---------------------------------------------------------------------------

@global_market_bp.route("/snapshot/status", methods=["GET"])
@login_required
def snapshot_status():
    """
    Return snapshot freshness metadata only — no market data payload.

    Useful for health-checks, debugging, and future frontend freshness indicators.
    """
    try:
        snap = read_macro_snapshot()

        if snap is None:
            return jsonify({
                "code": 1,
                "msg": "success",
                "data": {
                    "status": "pending",
                    "generated_at": None,
                    "age_seconds": None,
                    "stale": None,
                    "missing_sections": [],
                    "sources_ok": [],
                    "sources_failed": [],
                    "generation_duration_s": None,
                },
            })

        meta_full = {
            **snapshot_meta(snap),
            "sources_ok": snap.get("meta", {}).get("sources_ok", []),
            "sources_failed": snap.get("meta", {}).get("sources_failed", []),
            "generation_duration_s": snap.get("meta", {}).get("generation_duration_s"),
        }

        return jsonify({"code": 1, "msg": "success", "data": meta_full})

    except Exception as e:
        logger.error("snapshot_status failed: %s", e, exc_info=True)
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500


# ---------------------------------------------------------------------------
# Adanos sentiment — live (per-user params; cannot be pre-warmed generically)
# ---------------------------------------------------------------------------

@global_market_bp.route("/adanos-sentiment", methods=["GET"])
@login_required
def adanos_market_sentiment():
    """Get optional Adanos Market Sentiment for selected US stock tickers."""
    try:
        tickers = request.args.get("tickers", "")
        source = request.args.get("source")
        days = int(request.args.get("days") or 7)
        cache_key = f"adanos_sentiment:{source or 'default'}:{days}:{tickers.upper()}"

        cached = get_cached(cache_key, 300)
        if cached:
            return jsonify({"code": 1, "msg": "success", "data": cached})

        data = fetch_adanos_market_sentiment(tickers, source=source, days=days)
        if data.get("enabled") and not data.get("error"):
            set_cached(cache_key, data, 300)

        return jsonify({"code": 1, "msg": "success", "data": data})

    except ValueError as e:
        return jsonify({"code": 0, "msg": str(e), "data": None}), 400
    except Exception as e:
        logger.error("adanos_market_sentiment failed: %s", e, exc_info=True)
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500


# ---------------------------------------------------------------------------
# Trading opportunities — own dedicated cache (heavy scan, not in snapshot)
# ---------------------------------------------------------------------------

@global_market_bp.route("/opportunities", methods=["GET"])
@login_required
def trading_opportunities():
    """Scan for trading opportunities across Crypto, US/CN/HK Stocks, and Forex."""
    try:
        force = request.args.get("force", "").lower() in ("true", "1")

        if not force:
            cached = get_cached("trading_opportunities")
            if cached:
                return jsonify({"code": 1, "msg": "success", "data": cached})

        opportunities: list = []

        scanners = [
            ("Crypto", lambda: analyze_opportunities_crypto(opportunities)),
            ("USStock", lambda: analyze_opportunities_stocks(opportunities)),
            ("CNStock", lambda: analyze_opportunities_local_stocks(opportunities, "CNStock")),
            ("HKStock", lambda: analyze_opportunities_local_stocks(opportunities, "HKStock")),
            ("Forex", lambda: analyze_opportunities_forex(opportunities)),
        ]
        for label, scanner in scanners:
            try:
                scanner()
                count = len([o for o in opportunities if o.get("market") == label])
                logger.info("Trading opportunities: found %d %s opportunities", count, label)
            except Exception as e:
                logger.error("Failed to analyze %s opportunities: %s", label, e, exc_info=True)

        opportunities.sort(key=lambda x: abs(x.get("change_24h", 0)), reverse=True)

        by_market = {}
        for o in opportunities:
            by_market[o.get("market", "?")] = by_market.get(o.get("market", "?"), 0) + 1
        logger.info("Trading opportunities: total %d (%s)", len(opportunities), by_market)

        set_cached("trading_opportunities", opportunities, 3600)

        return jsonify({"code": 1, "msg": "success", "data": opportunities})

    except Exception as e:
        logger.error("trading_opportunities failed: %s", e, exc_info=True)
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500


# ---------------------------------------------------------------------------
# Section endpoint — serves a raw snapshot section by name
# ---------------------------------------------------------------------------

@global_market_bp.route("/section/<section_name>", methods=["GET"])
@login_required
def macro_section(section_name):
    """
    Serve a specific named section of the macro snapshot.

    Supported sections: liquidity, economy, inflation_rates, sentiment,
    overview, heatmap, news, calendar.
    """
    ALLOWED = {"liquidity", "economy", "inflation_rates", "sentiment",
               "overview", "heatmap", "news", "calendar"}
    if section_name not in ALLOWED:
        return jsonify({"code": 0, "msg": f"Unknown section: {section_name}", "data": None}), 400
    try:
        return _snapshot_response(section_name)
    except Exception as e:
        logger.error("macro_section failed for %s: %s", section_name, e, exc_info=True)
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500


# ---------------------------------------------------------------------------
# Refresh — triggers immediate background worker run
# ---------------------------------------------------------------------------

@global_market_bp.route("/refresh", methods=["POST"])
@login_required
def refresh_data():
    """
    Force an immediate macro snapshot refresh.

    This triggers the MacroSnapshotWorker to re-run its full collection cycle
    synchronously in a background thread (non-blocking for the caller).
    The short-lived dp:* data-provider cache entries are also cleared.
    """
    try:
        import threading

        def _do_refresh():
            try:
                from app.services.macro_snapshot_worker import get_macro_snapshot_worker
                get_macro_snapshot_worker().force_refresh()
            except Exception as exc:
                logger.error("Force refresh failed: %s", exc, exc_info=True)

        # Run in a separate thread so the HTTP response returns immediately.
        t = threading.Thread(target=_do_refresh, name="MacroSnapshotForceRefresh", daemon=True)
        t.start()

        # Also clear the short-lived data-provider cache to avoid stale sub-keys.
        clear_cache()

        return jsonify({
            "code": 1,
            "msg": "Macro snapshot refresh triggered in background. "
                   "Check /api/global-market/snapshot/status for progress.",
            "data": None,
        })
    except Exception as e:
        logger.error("refresh_data failed: %s", e, exc_info=True)
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500

# ---------------------------------------------------------------------------
# Timeseries Endpoint (P0 Macro Chart Integration)
# ---------------------------------------------------------------------------

@global_market_bp.route("/timeseries/<metric_key>", methods=["GET"])
def fetch_timeseries(metric_key):
    """
    Fetch historical timeseries data for a specific macro metric.
    Includes a short-lived cache (1 hour) to prevent FRED/YF/CNN spam.

    Sources supported:
      - fred:    Federal Reserve Economic Data (FRED) via app.utils.fred
      - yahoo:   Yahoo Finance via yfinance
      - cnn_fgi: CNN Fear & Greed Index (unofficial internal API)
      - calc:    Calculated from multiple FRED series (e.g. US Net Liquidity)
    """
    try:
        from app.utils.fred import fetch_fred_timeseries
        import yfinance as yf
        import pandas as pd
        import requests
        import datetime

        cache_key = f"macro_ts_{metric_key}"
        cached_data = get_cached(cache_key)
        if cached_data:
            return jsonify({"code": 1, "msg": "success", "data": cached_data})

        series = []
        name = ""
        unit = ""
        source = ""
        warnings = []
        stale = False

        # ----------------------------------------------------------------
        # MAPPER: maps chart_id -> data source config
        # ----------------------------------------------------------------
        MAPPER = {
            # Liquidity
            "liq_walcl":   {"source": "fred",  "id": "WALCL",           "name": "Fed Balance Sheet",       "unit": "Trillions (USD)",  "transform": lambda x: x * 0.001},
            "liq_tga":     {"source": "fred",  "id": "WDTGAL",          "name": "TGA Balance",             "unit": "Billions (USD)",   "transform": lambda x: x * 0.001},
            "liq_rrp":     {"source": "fred",  "id": "RRPONTSYD",       "name": "RRP Balance",             "unit": "Billions (USD)",   "transform": None},
            "liq_reserves":{"source": "fred",  "id": "WRESBAL",         "name": "Bank Reserves",           "unit": "Trillions (USD)",  "transform": lambda x: x * 0.001},
            "liq_nfci":    {"source": "fred",  "id": "NFCI",            "name": "NFCI",                    "unit": "Index",            "transform": None},
            # Rates & Inflation
            "inf_us10y":   {"source": "fred",  "id": "DGS10",           "name": "US 10Y Yield",            "unit": "Percent (%)",      "transform": None},
            "inf_us2y":    {"source": "fred",  "id": "DGS2",            "name": "US 2Y Yield",             "unit": "Percent (%)",      "transform": None},
            "inf_term_spread": {"source": "fred", "id": "T10Y2Y",       "name": "10Y-2Y Spread",           "unit": "Percent (%)",      "transform": None},
            "inf_dxy":     {"source": "yahoo", "id": "DX-Y.NYB",        "name": "US Dollar Index",         "unit": "Index",            "transform": None},
            "inf_cpi_yoy": {"source": "fred",  "id": "CPIAUCSL",        "name": "CPI YoY",                 "unit": "Percent (%)",      "transform": None,
                            "series_transform": lambda df: df["value"].pct_change(12) * 100},
            "inf_core_cpi_yoy": {"source": "fred", "id": "CPILFESL",   "name": "Core CPI YoY",            "unit": "Percent (%)",      "transform": None,
                            "series_transform": lambda df: df["value"].pct_change(12) * 100},
            "inf_core_pce_yoy": {"source": "fred", "id": "PCEPILFE",   "name": "Core PCE YoY",            "unit": "Percent (%)",      "transform": None,
                            "series_transform": lambda df: df["value"].pct_change(12) * 100},
            # Economy
            "eco_gdp":     {"source": "fred",  "id": "A191RL1Q225SBEA", "name": "GDP Growth",              "unit": "Percent (%)",      "transform": None},
            "eco_unrate":  {"source": "fred",  "id": "UNRATE",          "name": "Unemployment Rate",       "unit": "Percent (%)",      "transform": None},
            "eco_nfp":     {"source": "fred",  "id": "PAYEMS",          "name": "Nonfarm Payrolls (MoM)",  "unit": "Thousands",        "transform": None,
                            "series_transform": lambda df: df["value"].diff(1)},
            "eco_jobless": {"source": "fred",  "id": "ICSA",            "name": "Initial Jobless Claims",  "unit": "Number",           "transform": None},
            "eco_hy_spread":{"source": "fred", "id": "BAMLH0A0HYM2",   "name": "High Yield Spread",       "unit": "Percent (%)",      "transform": None},
            "eco_ig_spread": {"source": "fred", "id": "BAMLC0A0CMEY",  "name": "IG Spread",               "unit": "Percent (%)",      "transform": None},
            # Sentiment
            "sen_vix":     {"source": "yahoo", "id": "^VIX",            "name": "VIX",                     "unit": "Index",            "transform": None},
            "sen_fgi":     {"source": "cnn_fgi", "id": "fear_greed",    "name": "CNN Fear & Greed",        "unit": "Index (0-100)",    "transform": None},
            # Advanced — Rates & FX
            "adv_sofr":    {"source": "fred",  "id": "SOFR",            "name": "SOFR",                    "unit": "Percent (%)",      "transform": None},
            "adv_effr":    {"source": "fred",  "id": "FEDFUNDS",        "name": "Effective FF Rate",       "unit": "Percent (%)",      "transform": None},
            "adv_fed_rate":{"source": "fred",  "id": "DFEDTARU",        "name": "Fed Funds Rate (Target)", "unit": "Percent (%)",      "transform": None},
            "adv_us30y":   {"source": "fred",  "id": "DGS30",           "name": "US 30Y Yield",            "unit": "Percent (%)",      "transform": None},
            "adv_real_yield":{"source": "fred","id": "DFII10",          "name": "10Y Real Yield (TIPS)",   "unit": "Percent (%)",      "transform": None},
            "adv_usd_jpy": {"source": "yahoo", "id": "USDJPY=X",        "name": "USD/JPY",                 "unit": "Rate",             "transform": None},
            "adv_eur_usd": {"source": "yahoo", "id": "EURUSD=X",        "name": "EUR/USD",                 "unit": "Rate",             "transform": None},
            # Advanced — Inflation Expectations
            "adv_infl_1y": {"source": "fred",  "id": "MICH",            "name": "1Y Inflation Expectation","unit": "Percent (%)",     "transform": None},
            "adv_infl_5y": {"source": "fred",  "id": "T5YIE",           "name": "5Y Inflation Expectation","unit": "Percent (%)",     "transform": None},
            "adv_pce_yoy": {"source": "fred",  "id": "PCEPI",           "name": "PCE YoY",                 "unit": "Percent (%)",      "transform": None,
                            "series_transform": lambda df: df["value"].pct_change(12) * 100},
            "adv_ppi_yoy": {"source": "fred",  "id": "PPIACO",          "name": "PPI YoY",                 "unit": "Percent (%)",      "transform": None,
                            "series_transform": lambda df: df["value"].pct_change(12) * 100},
            # Advanced — Commodities
            "adv_wti":     {"source": "yahoo", "id": "CL=F",            "name": "WTI Crude",               "unit": "USD/bbl",          "transform": None},
            "adv_brent":   {"source": "yahoo", "id": "BZ=F",            "name": "Brent Crude",             "unit": "USD/bbl",          "transform": None},
            "adv_copper":  {"source": "yahoo", "id": "HG=F",            "name": "Copper",                  "unit": "USD/lb",           "transform": None},
            "adv_gold":    {"source": "yahoo", "id": "GC=F",            "name": "Gold",                    "unit": "USD/oz",           "transform": None},
            # Advanced — Economy
            "adv_retail_sales":{"source": "fred","id": "RSXFS",         "name": "Retail Sales YoY",        "unit": "Percent (%)",      "transform": None,
                            "series_transform": lambda df: df["value"].pct_change(12) * 100},
            "adv_cont_claims":{"source": "fred","id": "CCSA",           "name": "Continuing Claims",       "unit": "Number",           "transform": None},
            "adv_jolts":   {"source": "fred",  "id": "JTSJOL",          "name": "JOLTS Openings",          "unit": "Thousands",        "transform": None},
            "adv_wages":   {"source": "fred",  "id": "CES0500000003",   "name": "Avg Hourly Earnings YoY", "unit": "Percent (%)",      "transform": None,
                            "series_transform": lambda df: df["value"].pct_change(12) * 100},
            # Advanced — Sentiment / Economy extras
            "adv_consumer_conf": {"source": "fred", "id": "UMCSENT",          "name": "Consumer Confidence (Mich)", "unit": "Index",       "transform": None},
            "adv_recession_prob":{"source": "fred", "id": "RECPROUSM156N",    "name": "Recession Probability",      "unit": "Percent (%)", "transform": None},
            "adv_labor_part":    {"source": "fred", "id": "CIVPART",          "name": "Labor Force Participation",  "unit": "Percent (%)", "transform": None},
            # Inflation detail
            "adv_shelter":      {"source": "fred", "id": "CUSR0000SAH1",     "name": "Shelter Inflation",           "unit": "Percent (%)", "transform": None,
                                "series_transform": lambda df: df["value"].pct_change(12) * 100},
            "adv_supercore":    {"source": "fred", "id": "CUSR0000SAS2RS",   "name": "Supercore Inflation",         "unit": "Percent (%)", "transform": None,
                                "series_transform": lambda df: df["value"].pct_change(12) * 100},
            "adv_breakeven_10y":{"source": "fred", "id": "T10YIE",           "name": "10Y Breakeven Inflation",     "unit": "Percent (%)", "transform": None},
        }

        # ----------------------------------------------------------------
        # US Net Liquidity — special composite calculation
        # ----------------------------------------------------------------
        if metric_key == "liq_net_us":
            name = "US Net Liquidity"
            unit = "Trillions (USD)"
            source = "FRED Calculated"

            raw_walcl = fetch_fred_timeseries("WALCL")
            raw_tga   = fetch_fred_timeseries("WDTGAL")
            raw_rrp   = fetch_fred_timeseries("RRPONTSYD")

            if raw_walcl and raw_tga and raw_rrp:
                df_walcl = pd.DataFrame(raw_walcl).rename(columns={"value": "walcl"})
                df_walcl["walcl"] = df_walcl["walcl"] * 0.001
                df_walcl["time"]  = pd.to_datetime(df_walcl["time"])

                df_tga = pd.DataFrame(raw_tga).rename(columns={"value": "tga"})
                df_tga["tga"]  = df_tga["tga"] * 0.001
                df_tga["time"] = pd.to_datetime(df_tga["time"])

                df_rrp = pd.DataFrame(raw_rrp).rename(columns={"value": "rrp"})
                df_rrp["time"] = pd.to_datetime(df_rrp["time"])

                df_all = pd.merge(df_rrp, df_tga, on="time", how="outer")
                df_all = pd.merge(df_all, df_walcl, on="time", how="outer")
                df_all = df_all.sort_values("time").ffill().dropna()
                df_all["net_liq"] = df_all["walcl"] - df_all["tga"] - df_all["rrp"]

                cutoff = pd.Timestamp.now() - pd.DateOffset(years=3)
                for _, row in df_all[df_all["time"] >= cutoff].iterrows():
                    series.append({
                        "time":  row["time"].strftime("%Y-%m-%d"),
                        "value": round(float(row["net_liq"]), 3),
                    })
            else:
                warnings.append("One or more FRED components unavailable for US Net Liquidity.")
                stale = True

        # ----------------------------------------------------------------
        # Standard MAPPER-based routing
        # ----------------------------------------------------------------
        elif metric_key in MAPPER:
            config = MAPPER[metric_key]
            name   = config["name"]
            unit   = config["unit"]

            # -- CNN Fear & Greed ----------------------------------------
            if config["source"] == "cnn_fgi":
                source = "CNN Business"
                three_years_ago = (datetime.date.today() - datetime.timedelta(days=365 * 3)).strftime("%Y-%m-%d")
                cnn_url = f"https://production.dataviz.cnn.io/index/fearandgreed/graphdata/{three_years_ago}"
                try:
                    resp_cnn = requests.get(
                        cnn_url,
                        headers={
                            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
                            "Referer": "https://edition.cnn.com/markets/fear-and-greed",
                        },
                        timeout=15,
                    )
                    resp_cnn.raise_for_status()
                    fgi_payload = resp_cnn.json()
                    fg_arr = fgi_payload.get("fear_and_greed_historical", {}).get("data", [])
                    for pt in fg_arr:
                        ts_ms = pt.get("x")
                        val   = pt.get("y")
                        if ts_ms is not None and val is not None:
                            date_str = datetime.datetime.utcfromtimestamp(ts_ms / 1000).strftime("%Y-%m-%d")
                            series.append({"time": date_str, "value": round(float(val), 1)})
                except Exception as fgi_err:
                    logger.warning("CNN FGI fetch failed: %s", fgi_err)
                    warnings.append(f"CNN FGI fetch failed: {fgi_err}")
                    stale = True

            # -- FRED series (with optional pandas transform) -------------
            elif config["source"] == "fred":
                source = "FRED"
                raw_series = fetch_fred_timeseries(config["id"], mode=None)
                if raw_series and config.get("series_transform"):
                    df = pd.DataFrame(raw_series)
                    df["value"] = pd.to_numeric(df["value"], errors="coerce")
                    df["value"] = config["series_transform"](df)
                    raw_series = df.dropna().to_dict("records")

                # Limit to ~3 years of data points (daily ≈ 1000 pts)
                raw_series = raw_series[-1000:] if len(raw_series) > 1000 else raw_series
                for item in raw_series:
                    val = item["value"]
                    if config.get("transform") and val is not None:
                        val = config["transform"](val)
                    series.append({
                        "time":  item["time"],
                        "value": round(float(val), 3) if val is not None else None,
                    })

            # -- Yahoo Finance --------------------------------------------
            elif config["source"] == "yahoo":
                source = "Yahoo Finance"
                ticker = yf.Ticker(config["id"])
                hist = ticker.history(period="3y")
                if not hist.empty:
                    for idx, row in hist.iterrows():
                        val = float(row["Close"])
                        if config.get("transform") and val is not None:
                            val = config["transform"](val)
                        series.append({
                            "time":  idx.strftime("%Y-%m-%d"),
                            "value": round(float(val), 3),
                        })

        else:
            return jsonify({"code": 0, "msg": f"Unsupported metric: {metric_key}", "data": None}), 400

        # ----------------------------------------------------------------
        # Build response envelope
        # ----------------------------------------------------------------
        latest_pt   = None
        change_dict = {"1w": None, "1m": None}

        if series:
            latest_pt = series[-1]
            try:
                latest_val = float(latest_pt["value"])
                if len(series) >= 6:
                    w1 = float(series[-6]["value"])
                    if w1 != 0:
                        change_dict["1w"] = round((latest_val - w1) / abs(w1) * 100, 2)
                if len(series) >= 22:
                    m1 = float(series[-22]["value"])
                    if m1 != 0:
                        change_dict["1m"] = round((latest_val - m1) / abs(m1) * 100, 2)
            except Exception:
                pass
        else:
            if not stale:
                warnings.append("No historical data available for this metric.")
            stale = True

        response_data = {
            "metric_id":    metric_key,
            "display_name": name,
            "unit":         unit,
            "source":       source,
            "latest":       latest_pt,
            "change":       change_dict,
            "series":       series,
            "warnings":     warnings,
            "stale":        stale,
        }

        # Cache for 1 hour only when we have data
        if series:
            set_cached(cache_key, response_data, 3600)

        return jsonify({"code": 1, "msg": "success", "data": response_data})

    except Exception as e:
        logger.error("timeseries fetch failed for %s: %s", metric_key, e, exc_info=True)
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500

# -----------------------------------------------------------------------------
# AI Macro Briefing Routes
# -----------------------------------------------------------------------------

@global_market_bp.route('/cron/macro-briefing', methods=['POST'])
def cron_macro_briefing():
    """
    Cron trigger to generate the daily macro AI briefing.
    Should be protected in production (e.g., via Vercel cron secret).
    """
    from app.services.macro_ai_briefing import generate_daily_briefing
    try:
        briefing = generate_daily_briefing()
        return jsonify({
            "code": 1,
            "msg": "success",
            "data": briefing
        })
    except Exception as e:
        return jsonify({
            "code": 0,
            "msg": str(e),
            "data": None
        }), 500

@global_market_bp.route('/briefing/latest', methods=['GET'])
def get_latest_macro_briefing():
    """
    Returns the latest AI-generated macro briefing for the frontend.
    """
    from app.utils.cache import CacheManager
    from app.services.macro_ai_briefing import MACRO_BRIEFING_KEY
    from datetime import datetime, timezone
    
    cm = CacheManager()
    briefing = cm.get(MACRO_BRIEFING_KEY)
    
    if not briefing:
        # For demonstration purposes, if the cache is empty (cron not run),
        # return a mock AI briefing so the frontend can preview the new UI.
        mock_response = {
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "dataAsOf": datetime.now(timezone.utc).isoformat(),
            "overall": {
                "tone": "偏向进攻 / 顺势而为",
                "confidence": "High",
                "summary": "风险资产动能维持强势，流动性环境与市场情绪均支持估值进一步扩张。",
                "riskAssetImplication": "在没有破坏性黑天鹅的情况下，做空大盘风险极高，建议保持合理的风险敞口。"
            },
            "sections": {
                "liquidity": {
                    "tone": "宽松", "statusLabel": "Loose", "summary": "金融条件维持宽松区间", "riskAssetImplication": "Supportive",
                    "supportiveFactors": ["NFCI indicates loose conditions"], "suppressiveFactors": [], "keyCatalysts": []
                },
                "economy": {
                    "tone": "温和", "statusLabel": "Slowing", "summary": "经济温和扩张", "riskAssetImplication": "Neutral",
                    "supportiveFactors": ["GDP expansion intact"], "suppressiveFactors": [], "keyCatalysts": []
                },
                "inflationRates": {
                    "tone": "高压", "statusLabel": "High Yield", "summary": "美债收益率高企", "riskAssetImplication": "Suppressive",
                    "supportiveFactors": [], "suppressiveFactors": ["US10Y elevated"], "keyCatalysts": []
                },
                "sentiment": {
                    "tone": "贪婪", "statusLabel": "Greed", "summary": "市场情绪热烈", "riskAssetImplication": "Neutral",
                    "supportiveFactors": [], "suppressiveFactors": [], "keyCatalysts": []
                }
            },
            "drivers": {
                "supportive": [
                    {"text": "流动性泛滥支撑美股估值", "metricIds": ["nfci"]}
                ],
                "suppressive": [
                    {"text": "长端利率处于高压区，科技股承压", "metricIds": ["us10y"]}
                ]
            },
            "whatChanged": [
                {"title": "波动率降至新低", "description": "VIX跌破18，市场情绪进入极度自满区间。", "metricIds": ["vix"], "significance": "high"}
            ],
            "whatToWatch": [
                {"title": "逆回购见底", "description": "RRP接近枯竭，关注流动性缩量风险。", "metricIds": ["rrp"], "triggerCondition": "RRP < 0.5"}
            ]
        }
        return jsonify({
            "code": 1,
            "msg": "success (mocked)",
            "data": mock_response
        })
        
    return jsonify({
        "code": 1,
        "msg": "success",
        "data": briefing
    })

