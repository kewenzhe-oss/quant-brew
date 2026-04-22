"""
Global Market Dashboard APIs.

Provides aggregated global market data including:
- Major indices (US, Europe, Japan, Korea, Australia, India)
- Forex pairs
- Crypto prices
- Market heatmap data (crypto, stocks, forex)
- Economic calendar with impact indicators
- Fear & Greed Index / VIX
- Financial news (Chinese & English)

Endpoints:
- GET /api/global-market/overview       - Global market overview
- GET /api/global-market/heatmap        - Market heatmap data
- GET /api/global-market/news           - Financial news (with lang param)
- GET /api/global-market/calendar       - Economic calendar
- GET /api/global-market/sentiment      - Fear & Greed / VIX
- GET /api/global-market/opportunities  - Trading opportunities scanner
"""

from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from flask import Blueprint, jsonify, request

from app.utils.logger import get_logger
from app.utils.auth import login_required
import os
from functools import wraps

def public_if_allowed(f):
    """Dev-only bypass for global market read-only APIs."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if os.getenv("ALLOW_PUBLIC_GLOBAL_MARKET", "false").lower() == "true":
            return f(*args, **kwargs)
        return login_required(f)(*args, **kwargs)
    return decorated

# Unified data-provider layer
from app.data_providers import get_cached, set_cached, clear_cache
from app.data_providers.crypto import fetch_crypto_prices
from app.data_providers.forex import fetch_forex_pairs
from app.data_providers.commodities import fetch_commodities
from app.data_providers.indices import fetch_stock_indices
from app.data_providers.sentiment import (
    fetch_fear_greed_index, fetch_vix, fetch_dollar_index,
    fetch_yield_curve, fetch_vxn, fetch_gvz, fetch_put_call_ratio,
    fetch_inflation_data, fetch_employment_data, fetch_growth_data,
    fetch_wti_gold, fetch_rates_extended,
)
from app.data_providers.fed_liquidity import fetch_fed_liquidity
from app.data_providers.news import fetch_financial_news, get_economic_calendar
from app.data_providers.heatmap import generate_heatmap_data
from app.data_providers.opportunities import (
    analyze_opportunities_crypto, analyze_opportunities_stocks,
    analyze_opportunities_local_stocks, analyze_opportunities_forex,
)

logger = get_logger(__name__)

global_market_bp = Blueprint("global_market", __name__)


# ============ API Endpoints ============

@global_market_bp.route("/overview", methods=["GET"])
@public_if_allowed
def market_overview():
    """Get global market overview including indices, forex, crypto, and commodities."""
    try:
        cached = get_cached("market_overview", 30)
        if cached:
            logger.debug(
                "Returning cached overview: indices=%d, forex=%d, crypto=%d, commodities=%d",
                len(cached.get("indices", [])), len(cached.get("forex", [])),
                len(cached.get("crypto", [])), len(cached.get("commodities", [])),
            )
            return jsonify({"code": 1, "msg": "success", "data": cached})

        logger.info("Fetching fresh market overview data...")

        result = {
            "indices": [], "forex": [], "crypto": [], "commodities": [],
            "timestamp": int(time.time()),
        }

        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = {
                executor.submit(fetch_stock_indices): "indices",
                executor.submit(fetch_forex_pairs): "forex",
                executor.submit(fetch_crypto_prices): "crypto",
                executor.submit(fetch_commodities): "commodities",
            }
            for future in as_completed(futures):
                key = futures[future]
                try:
                    data = future.result()
                    result[key] = data if data else []
                    logger.info("Fetched %s: %d items", key, len(result[key]))
                    set_cached(f"{key}_data", result[key], 30)
                except Exception as e:
                    logger.error("Failed to fetch %s: %s", key, e, exc_info=True)
                    result[key] = []

        logger.info(
            "Market overview complete: indices=%d, forex=%d, crypto=%d, commodities=%d",
            len(result["indices"]), len(result["forex"]),
            len(result["crypto"]), len(result["commodities"]),
        )

        set_cached("stock_indices", result["indices"], 30)
        set_cached("forex_pairs", result["forex"], 30)
        set_cached("crypto_prices", result["crypto"], 30)
        set_cached("market_overview", result, 30)

        return jsonify({"code": 1, "msg": "success", "data": result})

    except Exception as e:
        logger.error("market_overview failed: %s", e, exc_info=True)
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500


@global_market_bp.route("/heatmap", methods=["GET"])
@public_if_allowed
def market_heatmap():
    """Get market heatmap data for crypto, stock sectors, forex, and indices."""
    try:
        cached = get_cached("market_heatmap", 30)
        if cached:
            return jsonify({"code": 1, "msg": "success", "data": cached})

        data = generate_heatmap_data()
        set_cached("market_heatmap", data, 30)

        return jsonify({"code": 1, "msg": "success", "data": data})

    except Exception as e:
        logger.error("market_heatmap failed: %s", e, exc_info=True)
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500


@global_market_bp.route("/news", methods=["GET"])
@public_if_allowed
def market_news():
    """Get financial news from various sources.  Query params: lang ('cn'|'en'|'all')."""
    try:
        lang = request.args.get("lang", "all")
        cache_key = f"market_news_{lang}"

        cached = get_cached(cache_key, 180)
        if cached:
            return jsonify({"code": 1, "msg": "success", "data": cached})

        news = fetch_financial_news(lang)
        set_cached(cache_key, news, 180)

        return jsonify({"code": 1, "msg": "success", "data": news})

    except Exception as e:
        logger.error("market_news failed: %s", e, exc_info=True)
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500


@global_market_bp.route("/calendar", methods=["GET"])
@public_if_allowed
def economic_calendar():
    """Get economic calendar events with impact indicators."""
    try:
        cached = get_cached("economic_calendar", 3600)
        if cached:
            return jsonify({"code": 1, "msg": "success", "data": cached})

        events = get_economic_calendar()
        set_cached("economic_calendar", events, 3600)

        return jsonify({"code": 1, "msg": "success", "data": events})

    except Exception as e:
        logger.error("economic_calendar failed: %s", e, exc_info=True)
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500


@global_market_bp.route("/sentiment", methods=["GET"])
@public_if_allowed
def market_sentiment():
    """Get comprehensive market sentiment indicators."""
    try:
        MACRO_CACHE_TTL = 21600
        cached = get_cached("market_sentiment", MACRO_CACHE_TTL)
        if cached:
            logger.debug("Returning cached sentiment data (6h cache)")
            return jsonify({"code": 1, "msg": "success", "data": cached})

        logger.info("Fetching fresh sentiment data (comprehensive)")

        with ThreadPoolExecutor(max_workers=13) as executor:
            futures = {
                executor.submit(fetch_fear_greed_index): "fear_greed",
                executor.submit(fetch_vix): "vix",
                executor.submit(fetch_dollar_index): "dxy",
                executor.submit(fetch_yield_curve): "yield_curve",
                executor.submit(fetch_vxn): "vxn",
                executor.submit(fetch_gvz): "gvz",
                executor.submit(fetch_put_call_ratio): "vix_term",
                executor.submit(fetch_fed_liquidity): "fed_liquidity",
                executor.submit(fetch_inflation_data): "inflation",
                executor.submit(fetch_employment_data): "employment",
                executor.submit(fetch_growth_data): "growth",
                executor.submit(fetch_wti_gold): "commodities_ext",
                executor.submit(fetch_rates_extended): "rates_extended",
            }
            results = {}
            for future in as_completed(futures):
                key = futures[future]
                try:
                    results[key] = future.result()
                except Exception as e:
                    logger.error("Failed to fetch %s: %s", key, e)
                    results[key] = None

        logger.info(
            "Sentiment data fetched: Fear&Greed=%s, VIX=%s, DXY=%s",
            results.get("fear_greed", {}).get("value"),
            results.get("vix", {}).get("value"),
            results.get("dxy", {}).get("value"),
        )

        data = {
            "fear_greed": results.get("fear_greed") or {"value": 50, "classification": "Neutral"},
            "vix": results.get("vix") or {"value": 0, "level": "unknown"},
            "dxy": results.get("dxy") or {"value": 0, "level": "unknown"},
            "yield_curve": results.get("yield_curve") or {"spread": 0, "level": "unknown"},
            "vxn": results.get("vxn") or {"value": 0, "level": "unknown"},
            "gvz": results.get("gvz") or {"value": 0, "level": "unknown"},
            "vix_term": results.get("vix_term") or {"value": 1.0, "level": "unknown"},
            # Fed balance sheet liquidity — WALCL / TGA / RRP
            # data_quality = 'real' | 'partial' | 'unavailable'
            "fed_liquidity": results.get("fed_liquidity") or {
                "walcl": None, "tga": None, "rrp": None,
                "net_liquidity": None, "data_quality": "unavailable",
                "source": "FRED via yfinance",
            },
            # CPI / Core PCE inflation data (FRED monthly)
            # data_quality = 'real' | 'partial' | 'unavailable'
            "inflation": results.get("inflation") or {
                "cpi_level": None, "cpi_yoy": None, "cpi_date": None,
                "pce_core_level": None, "pce_core_yoy": None, "pce_core_date": None,
                "data_quality": "unavailable", "source": "FRED via yfinance",
            },
            # Employment data (FRED monthly/weekly)
            # data_quality = 'real' | 'partial' | 'unavailable'
            "employment": results.get("employment") or {
                "unemployment_rate": None, "unemployment_date": None,
                "initial_claims": None, "initial_claims_date": None,
                "nonfarm_payrolls": None, "nonfarm_payrolls_mom": None, "nonfarm_payrolls_date": None,
                "data_quality": "unavailable", "source": "FRED via yfinance",
            },
            # Growth data (FRED monthly)
            # data_quality = 'real' | 'partial' | 'unavailable'
            "growth": results.get("growth") or {
                "ism_manufacturing": None, "ism_manufacturing_date": None,
                "ism_services": None, "ism_services_date": None,
                "retail_sales_mom": None, "retail_sales_date": None,
                "industrial_production_yoy": None, "industrial_production_date": None,
                "data_quality": "unavailable", "source": "FRED via yfinance",
            },
            # P1: WTI crude + Gold spot prices
            "commodities_ext": results.get("commodities_ext") or {
                "wti": None, "gold": None,
                "data_quality": "unavailable", "source": "yfinance CL=F / GC=F",
            },
            # P1: 30Y yield + Fed Funds Rate
            "rates_extended": results.get("rates_extended") or {
                "fed_funds": None, "us30y": None,
                "data_quality": "unavailable", "source": "yfinance ^TYX + FRED DFF",
            },
            "timestamp": int(time.time()),
        }

        set_cached("market_sentiment", data, MACRO_CACHE_TTL)

        return jsonify({"code": 1, "msg": "success", "data": data})

    except Exception as e:
        logger.error("market_sentiment failed: %s", e, exc_info=True)
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500


@global_market_bp.route("/opportunities", methods=["GET"])
@public_if_allowed
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



@global_market_bp.route("/refresh", methods=["POST"])
@public_if_allowed
def refresh_data():
    """Force refresh all market data (clears cache)."""
    try:
        clear_cache()
        return jsonify({"code": 1, "msg": "Cache cleared successfully", "data": None})
    except Exception as e:
        logger.error("refresh_data failed: %s", e, exc_info=True)
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500


# ── Macro history series ───────────────────────────────────────────────────────
#
# Whitelist of metric keys → yfinance tickers.
# Only read-only public market/macro data. No auth needed.
import datetime
import requests
import pandas as pd

_FRED_CSV_BASE = "https://fred.stlouisfed.org/graph/fredgraph.csv?id="
_FRED_HEADERS  = {"User-Agent": "Mozilla/5.0 (compatible; QuantBrew/1.0)"}

def _fetch_fred_history(series_id: str) -> list[dict]:
    """Fetch 1-year history from FRED CSV API."""
    url = f"{_FRED_CSV_BASE}{series_id}"
    resp = requests.get(url, timeout=20, headers=_FRED_HEADERS)
    if resp.status_code != 200:
        return []

    lines = resp.text.strip().split("\n")
    # Date limit: 1 year ago
    cutoff_date = (datetime.datetime.now() - datetime.timedelta(days=365)).strftime("%Y-%m-%d")
    
    points = []
    for line in lines:
        line = line.strip()
        if not line or line.startswith("DATE") or line.endswith("."):
            continue
        parts = line.split(",")
        if len(parts) == 2:
            date_str = parts[0].strip()
            if date_str >= cutoff_date:
                try:
                    val = float(parts[1].strip())
                    points.append({"time": date_str, "value": round(val, 4)})
                except ValueError:
                    pass
    return points

#
_SERIES_WHITELIST: dict[str, dict] = {
    "us10y":        {"ticker": "^TNX",       "label": "10Y 美债收益率",    "source": "yfinance", "unit": "%"},
    "us2y":         {"ticker": "^IRX",       "label": "2Y 美债收益率",    "source": "yfinance", "unit": "%"},
    "vix":          {"ticker": "^VIX",       "label": "VIX 隐含波动率",  "source": "yfinance", "unit": "index"},
    "dxy":          {"ticker": "DX-Y.NYB",   "label": "美元指数 DXY",    "source": "yfinance", "unit": "index"},
    "spx":          {"ticker": "^GSPC",      "label": "S&P 500",         "source": "yfinance", "unit": "pts"},
    "gold":         {"ticker": "GC=F",       "label": "黄金期货",        "source": "yfinance", "unit": "USD/oz"},
    # FRED monthly series — Inflation
    "cpi_yoy":      {"ticker": "CPIAUCSL",   "label": "CPI (CPIAUCSL)",  "source": "yfinance", "unit": "index"},
    "pce_core_yoy": {"ticker": "PCEPILFE",   "label": "Core PCE (PCEPILFE)", "source": "yfinance", "unit": "index"},
    # FRED series — Employment
    "unemployment_rate":   {"ticker": "UNRATE",   "label": "失业率 UNRATE",      "source": "yfinance", "unit": "%"},
    "initial_claims":      {"ticker": "IC4WSA",   "label": "初请失业金 IC4WSA", "source": "yfinance", "unit": "K"},
    "nonfarm_payrolls":    {"ticker": "PAYEMS",   "label": "非农就业 PAYEMS",    "source": "yfinance", "unit": "K"},
    # FRED series — Growth
    "ism_manufacturing":   {"ticker": "ISMMAN",   "label": "ISM 制造业 PMI",    "source": "yfinance", "unit": "index"},
    "ism_services":        {"ticker": "ISMSVC",   "label": "ISM 服务业 PMI",    "source": "yfinance", "unit": "index"},
    "industrial_production": {"ticker": "INDPRO", "label": "工业产出 INDPRO",   "source": "yfinance", "unit": "index"},
    
    # FRED direct series - Liquidity
    "walcl":    {"ticker": "WALCL",     "label": "Fed Total Assets", "source": "fred", "unit": "$B"},
    "tga":      {"ticker": "WTREGEN",   "label": "TGA Balance",      "source": "fred", "unit": "$B"},
    "rrp":      {"ticker": "RRPONTSYD", "label": "RRP Balance",      "source": "fred", "unit": "$B"},
    "wresbal":  {"ticker": "WRESBAL",   "label": "Bank Reserves",    "source": "fred", "unit": "$B"},
    "nfci":     {"ticker": "NFCI",      "label": "Chicago Fed NFCI", "source": "fred", "unit": "index"},
    "umcsent":  {"ticker": "UMCSENT",   "label": "UMich Consumer Sentiment", "source": "fred", "unit": "index"},
    "usslind":  {"ticker": "USSLIND",   "label": "Philly Fed State Leading Index", "source": "fred", "unit": "index"},
    
    # Computed Synthetic Series
    "us_net_liquidity": {"ticker": "SYNTH_LIQ", "label": "US Net Liquidity", "source": "synthetic", "unit": "$B"},
}


@global_market_bp.route("/series/<metric_key>", methods=["GET"])
def get_macro_series(metric_key: str):
    """
    GET /api/global-market/series/<metric_key>

    Returns 1-year daily history for a whitelisted macro metric.
    Response: { data: [{time: "YYYY-MM-DD", value: float}], label, unit }

    Used by the Macro Dimension drilldown charts (DimensionChart component).
    No auth required — public market data only.
    """
    if metric_key not in _SERIES_WHITELIST:
        return jsonify({
            "code": 0,
            "msg": f"Unknown metric: {metric_key}. Available: {list(_SERIES_WHITELIST.keys())}",
            "data": None,
        }), 404

    cache_key = f"macro_series_{metric_key}"
    cached = get_cached(cache_key)
    if cached is not None:
        return jsonify({"code": 1, "data": cached})

    cfg = _SERIES_WHITELIST[metric_key]
    ticker_sym = cfg["ticker"]

    try:
        source = cfg.get("source", "yfinance")
        points = []

        if source == "fred":
            points = _fetch_fred_history(ticker_sym)
        elif source == "synthetic" and metric_key == "us_net_liquidity":
            walcl_pts = _fetch_fred_history("WALCL")
            tga_pts = _fetch_fred_history("WTREGEN")
            rrp_pts = _fetch_fred_history("RRPONTSYD")

            # Dictionary by date
            walcl_map = {p["time"]: p["value"] for p in walcl_pts}
            tga_map = {p["time"]: p["value"] for p in tga_pts}
            rrp_map = {p["time"]: p["value"] for p in rrp_pts}

            dates = sorted(list(set(walcl_map.keys()) | set(tga_map.keys()) | set(rrp_map.keys())))
            for d in dates:
                w = walcl_map.get(d, 0.0)
                t = tga_map.get(d, 0.0)
                r = rrp_map.get(d, 0.0)
                if w > 0: # Only compute when we have core balance sheet data
                    points.append({"time": d, "value": round(w - t - r, 4)})
        else:
            # Fallback to yfinance
            import yfinance as yf
            ticker = yf.Ticker(ticker_sym)
            hist = ticker.history(period="1y", interval="1d")

            if hist is None or hist.empty:
                return jsonify({
                    "code": 0,
                    "msg": f"No history available for {ticker_sym}",
                    "data": None,
                }), 503

            for ts, row in hist.iterrows():
                date_str = ts.strftime("%Y-%m-%d")
                close_val = float(row["Close"])
                if close_val != close_val:  # NaN guard
                    continue
                points.append({"time": date_str, "value": round(close_val, 4)})

        if not points:
             return jsonify({"code": 0, "msg": f"No history available for {metric_key}", "data": None}), 503

        result = {
            "metric": metric_key,
            "label":  cfg["label"],
            "unit":   cfg["unit"],
            "ticker": ticker_sym,
            "points": points,
        }

        # Cache for 30 minutes (daily data, no need for high frequency)
        set_cached(cache_key, result, ttl=1800)

        logger.info("macro_series %s (%s): %d points", metric_key, ticker_sym, len(points))
        return jsonify({"code": 1, "data": result})

    except Exception as e:
        logger.error("macro_series %s failed: %s", metric_key, e, exc_info=True)
        return jsonify({"code": 0, "msg": str(e), "data": None}), 500
