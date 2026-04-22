"""
Phase 0.5 — Runtime Contract Verification
==========================================
Verifies 3 backend endpoints' real payload shapes against the frontend types.ts contract.
Runs WITHOUT Flask, DB, or Auth — calls data_providers directly.

Usage:
    cd backend_api_python
    python3.11 verify_contracts.py

Output:
    verify_output/overview_raw.json
    verify_output/sentiment_raw.json
    verify_output/fast_analysis_raw.json
    verify_output/contract_diff.md   ← the money output
"""

import json
import os
import sys
import time
import traceback
from pathlib import Path

# ── Allow importing from the backend app package ────────────────────────────
sys.path.insert(0, str(Path(__file__).parent))

OUT_DIR = Path(__file__).parent / "verify_output"
OUT_DIR.mkdir(exist_ok=True)

# ────────────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────────────

def _save(name: str, data) -> Path:
    p = OUT_DIR / name
    with open(p, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    print(f"  ✅  saved  {p.relative_to(Path(__file__).parent)}")
    return p


def _header(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def _field(label: str, obj, *keys):
    """Drill into nested obj via keys, return value or MISSING sentinel."""
    cur = obj
    for k in keys:
        if isinstance(cur, dict):
            if k not in cur:
                return f"⛔ MISSING (path: {'.'.join(str(x) for x in keys)})"
            cur = cur[k]
        else:
            return f"⛔ NOT A DICT at key '{k}'"
    return cur


# ────────────────────────────────────────────────────────────────────────────
# 1. OVERVIEW  GET /api/global-market/overview
# ────────────────────────────────────────────────────────────────────────────

def verify_overview():
    _header("1/3  GET /api/global-market/overview")

    try:
        from app.data_providers.indices import fetch_stock_indices
        from app.data_providers.crypto import fetch_crypto_prices
        from app.data_providers.forex import fetch_forex_pairs
        from app.data_providers.commodities import fetch_commodities
    except ImportError as e:
        print(f"  ❌ Import failed: {e}")
        return None

    result = {}
    for label, fn, key in [
        ("indices",     fetch_stock_indices,  "indices"),
        ("forex",       fetch_forex_pairs,    "forex"),
        ("crypto",      fetch_crypto_prices,  "crypto"),
        ("commodities", fetch_commodities,    "commodities"),
    ]:
        try:
            print(f"  Fetching {label}…", end=" ", flush=True)
            t0 = time.time()
            data = fn()
            elapsed = time.time() - t0
            result[key] = data
            count = len(data) if isinstance(data, list) else "?"
            print(f"{count} items  ({elapsed:.1f}s)")
        except Exception as e:
            print(f"FAIL: {e}")
            result[key] = []

    result["timestamp"] = int(time.time())
    _save("overview_raw.json", result)

    # ── Contract diff ────────────────────────────────────────────────────────
    print("\n  ── Contract check vs frontend MarketOverview / IndexData ──")

    # Front-end expects:  MarketOverview {
    #   us_indices: IndexData[]   ← grouped!
    #   global_indices: IndexData[]
    #   crypto: IndexData[]
    #   forex: IndexData[]
    #   commodities: IndexData[]
    #   futures: IndexData[]
    #   timestamp: string
    # }
    # IndexData { name, symbol, price, change, change_percent, currency? }

    # Backend actually returns flat `indices` array (not split us/global).
    issues = []
    notes  = []

    indices = result.get("indices", [])
    if indices:
        sample = indices[0]
        print(f"\n  indices[0] raw keys: {list(sample.keys())}")
        # Check field names
        for fe_key, be_key in [
            ("name",          None),    # FE expects 'name', BE has name_cn / name_en
            ("change_percent", None),   # FE expects 'change_percent', BE has 'change' (%)
            ("symbol",        "symbol"),
            ("price",         "price"),
        ]:
            if fe_key == "name":
                has_name    = "name"    in sample
                has_name_cn = "name_cn" in sample
                has_name_en = "name_en" in sample
                if not has_name and (has_name_cn or has_name_en):
                    issues.append(
                        f"FIELD NAME MISMATCH — indices[].name: FE expects 'name', "
                        f"BE returns 'name_cn'={sample.get('name_cn')} / 'name_en'={sample.get('name_en')}"
                    )
                    notes.append("normalizer findIndex() searches item.name → will always miss, returns undefined")
                else:
                    print(f"    ✅ 'name' key present: {sample.get('name')}")
            elif fe_key == "change_percent":
                has_cp = "change_percent" in sample
                has_ch = "change" in sample
                if not has_cp and has_ch:
                    ch_val = sample.get("change")
                    issues.append(
                        f"FIELD NAME MISMATCH — indices[].change_percent: FE expects 'change_percent', "
                        f"BE returns 'change'={ch_val} (this IS the % value per source code)"
                    )
                    notes.append("normalizer indexToTicker() reads item.change_percent → undefined → NaN in UI")
                elif has_cp:
                    print(f"    ✅ 'change_percent' key present: {sample.get('change_percent')}")
            else:
                if sample.get(be_key) is not None or be_key in sample:
                    print(f"    ✅ '{be_key}' key present")
                else:
                    issues.append(f"MISSING — indices[].{be_key} not in response")

        # Check grouping
        regions = {s.get("region") for s in indices}
        issues.append(
            f"STRUCTURE MISMATCH — FE expects us_indices[] + global_indices[], "
            f"BE returns flat 'indices[]' with {len(indices)} items. "
            f"Regions present: {regions}"
        )
        notes.append("normalizer normalizeMarketSnapshot() calls overview.us_indices → undefined → no US indices shown")

    crypto = result.get("crypto", [])
    if crypto:
        sample = crypto[0]
        print(f"\n  crypto[0] raw keys: {list(sample.keys())}")
        # FE IndexData expects: name, symbol, price, change, change_percent
        for key in ["name", "symbol", "price", "change", "change_percent"]:
            if key in sample:
                print(f"    ✅ '{key}': {sample.get(key)}")
            else:
                issues.append(f"CRYPTO MISSING — crypto[].{key} not in response")

    forex = result.get("forex", [])
    if forex:
        sample = forex[0]
        print(f"\n  forex[0] raw keys: {list(sample.keys())}")
        for key in ["name", "symbol", "price", "change", "change_percent"]:
            if key in sample:
                print(f"    ✅ '{key}': {sample.get(key)}")
            else:
                issues.append(f"FOREX MISSING — forex[].{key} not in response")

    return {"issues": issues, "notes": notes, "raw_sample_indices": indices[:1] if indices else []}


# ────────────────────────────────────────────────────────────────────────────
# 2. SENTIMENT  GET /api/global-market/sentiment
# ────────────────────────────────────────────────────────────────────────────

def verify_sentiment():
    _header("2/3  GET /api/global-market/sentiment")

    try:
        from app.data_providers.sentiment import (
            fetch_fear_greed_index, fetch_vix, fetch_dollar_index,
            fetch_yield_curve, fetch_put_call_ratio,
        )
        from app.data_providers.fed_liquidity import fetch_fed_liquidity
    except ImportError as e:
        print(f"  ❌ Import failed: {e}")
        return None

    results = {}
    for label, fn in [
        ("fear_greed",   fetch_fear_greed_index),
        ("vix",          fetch_vix),
        ("dxy",          fetch_dollar_index),
        ("yield_curve",  fetch_yield_curve),
        ("put_call_ratio", fetch_put_call_ratio),
        ("fed_liquidity", fetch_fed_liquidity),
    ]:
        try:
            print(f"  Fetching {label}…", end=" ", flush=True)
            t0 = time.time()
            data = fn()
            elapsed = time.time() - t0
            results[label] = data
            print(f"OK  ({elapsed:.1f}s)  → {json.dumps(data, default=str)[:120]}")
        except Exception as e:
            print(f"FAIL: {e}")
            results[label] = None

    sentiment_payload = {
        "fear_greed":    results.get("fear_greed") or {"value": 50, "classification": "Neutral"},
        "vix":           results.get("vix")         or {"value": 0, "level": "unknown"},
        "dxy":           results.get("dxy")         or {"value": 0, "level": "unknown"},
        "yield_curve":   results.get("yield_curve") or {"spread": 0, "level": "unknown"},
        "vxn":           {"value": 0, "level": "unknown"},  # skipped for speed
        "gvz":           {"value": 0, "level": "unknown"},  # skipped for speed
        "vix_term":      results.get("put_call_ratio") or {"value": 1.0, "level": "unknown"},
        "fed_liquidity": results.get("fed_liquidity") or {
            "walcl": None, "tga": None, "rrp": None,
            "net_liquidity": None, "data_quality": "unavailable", "source": "FRED via yfinance",
        },
        "timestamp": int(time.time()),
    }
    _save("sentiment_raw.json", sentiment_payload)

    # ── Contract diff ────────────────────────────────────────────────────────
    print("\n  ── Contract check vs frontend SentimentData ──")

    # FE SentimentData interface expects:
    # vix: { value, change, change_percent, status }
    # fear_greed: { value, label, previous }
    # dxy: { value, change, change_percent }
    # us10y: { value, change }               ← NOT in backend sentiment payload!
    # yield_curve: { spread, status }
    # put_call_ratio?: { value, status }
    # fed_liquidity?: FedLiquidityData
    # timestamp: string

    issues = []
    notes  = []

    vix = sentiment_payload.get("vix") or {}
    print(f"\n  vix raw:         {vix}")
    # FE wants: value, change, change_percent, status
    for k in ["value", "change", "change_percent", "status"]:
        if k in vix:
            print(f"    ✅ vix.{k} = {vix[k]}")
        else:
            issues.append(f"vix.{k}: FE expects this key, BE has: {list(vix.keys())}")

    fear_greed = sentiment_payload.get("fear_greed") or {}
    print(f"\n  fear_greed raw:  {fear_greed}")
    # FE wants: value, label, previous
    for k in ["value", "label", "previous"]:
        if k in fear_greed:
            print(f"    ✅ fear_greed.{k} = {fear_greed[k]}")
        else:
            actual_key = "classification" if k == "label" else k
            issues.append(
                f"fear_greed.{k}: FE expects '{k}', BE has '{actual_key}'={fear_greed.get(actual_key, '⛔ MISSING')}"
            )

    dxy = sentiment_payload.get("dxy") or {}
    print(f"\n  dxy raw:         {dxy}")
    for k in ["value", "change", "change_percent"]:
        if k in dxy:
            print(f"    ✅ dxy.{k} = {dxy[k]}")
        else:
            issues.append(f"dxy.{k}: FE expects this key, BE has: {list(dxy.keys())}")

    yc = sentiment_payload.get("yield_curve") or {}
    print(f"\n  yield_curve raw: {yc}")
    # FE wants: spread, status
    for k in ["spread", "status"]:
        if k in yc:
            print(f"    ✅ yield_curve.{k} = {yc[k]}")
        else:
            issues.append(
                f"yield_curve.{k}: FE expects '{k}', BE has: {list(yc.keys())} "
                f"(BE uses 'level'/'signal' instead of 'status')"
            )

    # us10y: FE expects SentimentData.us10y — NOT in backend sentiment at all
    if "us10y" not in sentiment_payload:
        issues.append(
            "us10y: FE SentimentData requires 'us10y: {value, change}' — "
            "this field is NOT returned by backend /sentiment. "
            "assess.ts and normalizer will fall back to undefined for all 10Y logic."
        )
        notes.append(
            "assess.ts assessLiquidity() checks s?.us10y — will always be undefined from real API. "
            "Also assessInflationRates() checks s?.us10y → placeholderDimension() always runs."
        )

    # fed_liquidity — FE FedLiquidityData
    fl = sentiment_payload.get("fed_liquidity") or {}
    print(f"\n  fed_liquidity:   {fl}")
    for k in ["walcl", "tga", "rrp", "net_liquidity", "data_quality", "source"]:
        v = fl.get(k)
        marker = "✅" if k in fl else "⛔"
        print(f"    {marker} fed_liquidity.{k} = {v}")

    # put_call_ratio in FE is { value, status } — backend uses vix_term key with { value, level }
    vix_term = sentiment_payload.get("vix_term") or {}
    print(f"\n  vix_term (→ put_call_ratio in FE): {vix_term}")
    issues.append(
        f"put_call_ratio: FE expects sentiment root key 'put_call_ratio' with {{value, status}}. "
        f"BE returns key 'vix_term' with {{value, level, signal}}. "
        f"Key name mismatch: vix_term ≠ put_call_ratio, 'level' ≠ 'status'."
    )

    return {"issues": issues, "notes": notes}


# ────────────────────────────────────────────────────────────────────────────
# 3. FAST ANALYSIS   POST /api/fast-analysis/analyze
#    We call the service directly (no HTTP, no auth, no billing)
# ────────────────────────────────────────────────────────────────────────────

def verify_fast_analysis():
    _header("3/3  POST /api/fast-analysis/analyze  (direct service call, no auth)")

    # We need LLM key from env — check if available
    llm_key = (
        os.getenv("OPENROUTER_API_KEY") or
        os.getenv("OPENAI_API_KEY") or
        os.getenv("GOOGLE_API_KEY") or
        ""
    ).strip()

    if not llm_key:
        print("  ⚠️  No LLM API key found in environment.")
        print("     Falling back to DATA-ONLY verification (collecting market data, skipping LLM call).")
        print("     To get the full analysis payload, set OPENROUTER_API_KEY= in your shell.")
        print("     e.g.:  export OPENROUTER_API_KEY=sk-or-xxxx  && python3.11 verify_contracts.py")

    # Try to import the service
    try:
        # Stub out things that need DB / full init
        import unittest.mock as mock

        # Patch DB-dependent modules before importing service
        with mock.patch.dict("sys.modules", {
            "app.utils.db": mock.MagicMock(),
            "app.utils.config_loader": mock.MagicMock(),
            "app.services.analysis_memory": mock.MagicMock(),
            "app.services.billing_service": mock.MagicMock(),
        }):
            from app.services.fast_analysis import FastAnalysisService
            from app.services.market_data_collector import get_market_data_collector

    except Exception as e:
        print(f"  ❌ Service import failed: {e}")
        traceback.print_exc()
        # Fall back: just fetch market data independently
        return _verify_fast_analysis_data_only()

    print("  Collecting market data for AAPL/USStock…", flush=True)
    t0 = time.time()
    try:
        collector = get_market_data_collector()
        market_data = collector.collect_all(
            market="USStock",
            symbol="AAPL",
            timeframe="1D",
            include_macro=True,
            include_news=True,
            include_polymarket=False,
            timeout=45,
        )
        elapsed = time.time() - t0
        print(f"  Market data collected in {elapsed:.1f}s")
        print(f"  Top-level keys: {list(market_data.keys())}")
    except Exception as e:
        print(f"  ❌ market data collect failed: {e}")
        traceback.print_exc()
        return _verify_fast_analysis_data_only()

    if not llm_key:
        # Save the market data payload — still useful for contract verification
        _save("fast_analysis_market_data.json", market_data)
        print("\n  ── Skipping LLM call (no API key). Market data saved. ──")
        result = _build_stub_analysis_result(market_data)
        _save("fast_analysis_raw.json", result)
        return _check_analysis_contract(result)

    # With LLM key: run real analysis
    try:
        print(f"\n  Running LLM analysis (key found: {llm_key[:8]}…)…", flush=True)
        svc = FastAnalysisService()
        t0 = time.time()
        result = svc.analyze(
            market="USStock",
            symbol="AAPL",
            language="zh-CN",
            model=None,   # use provider default
            timeframe="1D",
            user_id=0,    # no auth user
        )
        elapsed = time.time() - t0
        print(f"  Analysis completed in {elapsed:.1f}s")
        _save("fast_analysis_raw.json", result)
        return _check_analysis_contract(result)
    except Exception as e:
        print(f"  ❌ LLM analysis failed: {e}")
        traceback.print_exc()
        result = _build_stub_analysis_result(market_data)
        _save("fast_analysis_raw.json", result)
        return _check_analysis_contract(result)


def _verify_fast_analysis_data_only():
    """Fallback: just verify market data collection independently."""
    try:
        from app.services.market_data_collector import get_market_data_collector
        print("  Collecting market data via MarketDataCollector…", flush=True)
        collector = get_market_data_collector()
        data = collector.collect_all(
            market="Crypto", symbol="BTC/USDT", timeframe="1D",
            include_macro=True, include_news=False, include_polymarket=False,
            timeout=30,
        )
        _save("fast_analysis_market_data.json", data)
        result = _build_stub_analysis_result(data)
        _save("fast_analysis_raw.json", result)
        return _check_analysis_contract(result)
    except Exception as e:
        print(f"  ❌ Fallback also failed: {e}")
        stub = {
            "error": f"Could not collect market data: {e}",
            "market": "USStock", "symbol": "AAPL",
        }
        _save("fast_analysis_raw.json", stub)
        return {"issues": [f"Market data collection failed: {e}"], "notes": []}


def _build_stub_analysis_result(market_data: dict) -> dict:
    """Build a stub analysis result from real market data (no LLM)."""
    price_data = market_data.get("price") or {}
    indicators  = market_data.get("indicators") or {}
    return {
        "__stub__":     True,
        "__note__":     "Real LLM fields omitted (no API key). Market data fields are real.",
        "decision":     "HOLD",
        "confidence":   65,
        "summary":      "[stub] No LLM key provided",
        "detailed_analysis": {
            "technical":    "[stub]",
            "fundamental":  "[stub]",
            "sentiment":    "[stub]",
        },
        "trading_plan": {
            "entry_price":      price_data.get("price"),
            "stop_loss":        None,
            "take_profit":      None,
            "position_size_pct": 5,
        },
        "reasons":  [],
        "risks":    [],
        "scores": {
            "technical":    50,
            "fundamental":  50,
            "sentiment":    50,
            "overall":      50,
        },
        "objective_score": {
            "overall_score":      0,
            "technical_score":    0,
            "fundamental_score":  0,
            "sentiment_score":    0,
            "macro_score":        0,
        },
        "market_data": {
            "current_price": price_data.get("price"),
            "change_24h":    price_data.get("changePercent"),
            "support":       None,
            "resistance":    None,
        },
        "indicators": {
            "rsi":  indicators.get("rsi"),
            "macd": indicators.get("macd"),
            "moving_averages": indicators.get("moving_averages"),
            "levels":          indicators.get("levels"),
            "volatility":      indicators.get("volatility"),
            "current_price":   price_data.get("price"),
            "volume_ratio":    indicators.get("volume_ratio"),
        },
        "consensus": {
            "consensus_score":    50,
            "consensus_decision": "HOLD",
            "agreement_ratio":    0.5,
            "quality_multiplier": 1.0,
            "market_regime":      "unknown",
        },
        "trend_outlook": market_data.get("trend_outlook"),
        "trend_outlook_summary": None,
        "crypto_factors": market_data.get("crypto_factors"),
        "analysis_time_ms": 0,
        "error": None,
        # Real data fields
        "_real_market_data_keys": list(market_data.keys()),
        "_price": price_data,
        "_macro_keys": list((market_data.get("macro") or {}).keys()),
    }


def _check_analysis_contract(result: dict) -> dict:
    """
    Check the result dict against frontend RawAnalysisResponse interface.

    interface RawAnalysisResponse {
      market, symbol, language, model, timeframe
      decision, confidence, summary
      detailed_analysis: { technical, fundamental, sentiment }
      trading_plan: { entry_price, stop_loss, take_profit, position_size_pct }
      reasons, risks
      scores: { technical, fundamental, sentiment, overall }
      objective_score: { overall, technical, fundamental, sentiment, macro }
      market_data: { current_price, change_24h, support, resistance }
      indicators: { rsi?, macd?, moving_averages?, levels?, volatility?, current_price?, volume_ratio? }
      consensus?: { consensus_score, consensus_decision, agreement_ratio, quality_multiplier, market_regime }
      trend_outlook?: Record<string, {score, trend, strength}>
      trend_outlook_summary?: string
      crypto_factors?: Record<string, unknown>
      analysis_time_ms
      error
    }
    """
    print("\n  ── Contract check vs frontend RawAnalysisResponse ──")
    issues = []
    notes  = []
    TRADING_ONLY = []

    # Root-level fields
    root_expected = [
        "decision", "confidence", "summary", "reasons", "risks",
        "analysis_time_ms", "error",
    ]
    for k in root_expected:
        v = result.get(k)
        marker = "✅" if k in result else "⛔ MISSING"
        print(f"    {marker} {k}: {str(v)[:80] if v is not None else '(null)'}")
        if k not in result:
            issues.append(f"ROOT MISSING — {k}")

    # Trading-only fields (present but harmful to expose)
    print("\n  ── Trading-only fields (present in response, blocked by adapter) ──")
    trading_fields = ["decision", "trading_plan"]
    for k in trading_fields:
        if k in result:
            TRADING_ONLY.append(k)
            print(f"    🔴 TRADING: {k} = {json.dumps(result.get(k), default=str)[:80]}")

    tp = result.get("trading_plan") or {}
    if tp:
        print(f"    🔴 TRADING: trading_plan keys = {list(tp.keys())}")
        for tk in ["entry_price", "stop_loss", "take_profit", "position_size_pct"]:
            if tk in tp:
                TRADING_ONLY.append(f"trading_plan.{tk}")

    # Valuable nested fields
    print("\n  ── Valuable nested fields (research-usable) ──")
    nested_checks = {
        "detailed_analysis": ["technical", "fundamental", "sentiment"],
        "scores":            ["technical", "fundamental", "sentiment", "overall"],
        "market_data":       ["current_price", "change_24h", "support", "resistance"],
        "indicators":        ["rsi", "macd", "moving_averages", "levels", "volatility",
                              "current_price", "volume_ratio"],
        "consensus":         ["consensus_score", "consensus_decision", "agreement_ratio",
                              "quality_multiplier", "market_regime"],
        "objective_score":   ["overall_score", "technical_score", "fundamental_score",
                              "sentiment_score", "macro_score"],
    }
    for parent, children in nested_checks.items():
        block = result.get(parent)
        if block is None:
            issues.append(f"NESTED MISSING — {parent}: entire block is null/absent")
            print(f"    ⛔ {parent}: ENTIRELY MISSING")
            continue
        for c in children:
            v = block.get(c) if isinstance(block, dict) else None
            marker = "✅" if isinstance(block, dict) and c in block else "⚠️ null/absent"
            print(f"    {marker} {parent}.{c}: {str(v)[:60] if v is not None else '(null)'}")
            if isinstance(block, dict) and c not in block:
                issues.append(f"NESTED MISSING — {parent}.{c}")

    # Optional high-value fields
    print("\n  ── Optional high-value fields ──")
    for k in ["trend_outlook", "trend_outlook_summary", "crypto_factors"]:
        v = result.get(k)
        present = v is not None
        if present and isinstance(v, dict):
            print(f"    ✅ {k}: dict with {len(v)} keys")
        elif present:
            print(f"    ✅ {k}: {str(v)[:60]}")
        else:
            print(f"    ℹ️  {k}: null/absent (optional)")

    notes.append(
        "researchAdapter.ts cleanNarrative() regex patterns strip: "
        "建议BUY/SELL/HOLD, entry_price, stop_loss, take_profit, position_size. "
        "Actual payload trading noise: " + ", ".join(TRADING_ONLY)
    )

    return {
        "issues":       issues,
        "notes":        notes,
        "trading_only": TRADING_ONLY,
        "stub":         result.get("__stub__", False),
    }


# ────────────────────────────────────────────────────────────────────────────
# Summary Report
# ────────────────────────────────────────────────────────────────────────────

def write_report(overview_result, sentiment_result, analysis_result):
    _header("WRITING CONTRACT DIFF REPORT")

    lines = [
        "# Phase 0.5 — Runtime Contract Diff Report",
        f"> Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "---",
        "",
        "## 1. GET /api/global-market/overview",
        "",
        "### Issues (frontend normalizer will silently break)",
    ]

    if overview_result:
        for issue in overview_result.get("issues", []):
            lines.append(f"- 🔴 {issue}")
        if not overview_result.get("issues"):
            lines.append("- ✅ No issues found")
        lines.append("")
        lines.append("### Notes")
        for note in overview_result.get("notes", []):
            lines.append(f"- {note}")
        if overview_result.get("raw_sample_indices"):
            lines.append("")
            lines.append("### Raw sample — indices[0]")
            lines.append("```json")
            lines.append(json.dumps(overview_result["raw_sample_indices"][0], indent=2, default=str))
            lines.append("```")
    else:
        lines.append("- ❌ Could not run verification (import error)")

    lines += [
        "",
        "---",
        "",
        "## 2. GET /api/global-market/sentiment",
        "",
        "### Issues (frontend SentimentData assumptions that are wrong)",
    ]

    if sentiment_result:
        for issue in sentiment_result.get("issues", []):
            lines.append(f"- 🔴 {issue}")
        if not sentiment_result.get("issues"):
            lines.append("- ✅ No issues found")
        lines.append("")
        lines.append("### Notes")
        for note in sentiment_result.get("notes", []):
            lines.append(f"- {note}")
    else:
        lines.append("- ❌ Could not run verification (import error)")

    lines += [
        "",
        "---",
        "",
        "## 3. POST /api/fast-analysis/analyze",
        "",
    ]

    if analysis_result:
        if analysis_result.get("stub"):
            lines.append(
                "> ⚠️ Stub run (no LLM key). "
                "Market data collected. LLM-generated text fields are placeholders."
            )
            lines.append("")
        lines.append("### Issues (contract violations)")
        for issue in analysis_result.get("issues", []):
            lines.append(f"- 🔴 {issue}")
        if not analysis_result.get("issues"):
            lines.append("- ✅ No structural issues found")
        lines.append("")
        lines.append("### Trading-only fields (present in raw response, adapter must block)")
        for tf in analysis_result.get("trading_only", []):
            lines.append(f"- 🔴 `{tf}`")
        lines.append("")
        lines.append("### Notes")
        for note in analysis_result.get("notes", []):
            lines.append(f"- {note}")
    else:
        lines.append("- ❌ Could not run verification (import error)")

    lines += [
        "",
        "---",
        "",
        "## Recommended Immediate Actions",
        "",
        "These are normalization gaps, NOT code rewrites:",
        "",
        "1. **overview normalizer** — map `indices[].name_cn` → `name`, `indices[].change` → `change_percent`; split `indices[]` into `us_indices` vs `global_indices` by `region`",
        "2. **sentiment normalizer** — map `fear_greed.classification` → `label`; add `us10y` by fetching `^TNX` (it's in yield_curve already as `yield_10y`); map `yield_curve.level` → `status`; rename `vix_term` → `put_call_ratio`",
        "3. **fast_analysis adapter** — current regex approach is fragile; consider moving to field-whitelist approach in `mapToResearchDisplay()`",
        "",
        "---",
        "",
        "**STOP — verification only, no code changes until this report is reviewed.**",
    ]

    report_path = OUT_DIR / "contract_diff.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"\n  ✅  Report written to {report_path.relative_to(Path(__file__).parent)}")
    return report_path


# ────────────────────────────────────────────────────────────────────────────
# Main
# ────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n🔍  Phase 0.5 — Runtime Contract Verification")
    print(f"    Output directory: {OUT_DIR}")
    print(f"    Python: {sys.executable}")

    # Load .env if present
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        print(f"    Loading .env from {env_file}")
        for line in env_file.read_text().splitlines():
            if line.strip() and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())
    else:
        print(f"    No .env found — LLM calls will be skipped unless key is in shell env")

    overview_result   = verify_overview()
    sentiment_result  = verify_sentiment()
    analysis_result   = verify_fast_analysis()
    report_path       = write_report(overview_result, sentiment_result, analysis_result)

    print(f"\n{'='*60}")
    print(f"  DONE — see {OUT_DIR.name}/contract_diff.md for the full report")
    print(f"{'='*60}\n")
