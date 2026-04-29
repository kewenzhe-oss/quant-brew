"""
Macro Snapshot — core snapshot engine.

Responsibilities:
- Define the canonical MacroSnapshot schema.
- generate_macro_snapshot(): collect all macro data sections via parallel
  ThreadPoolExecutor calls to existing data-provider functions.
  Handles partial provider failures gracefully (degraded status).
- write_macro_snapshot(): atomically persist to CacheManager (Redis or
  in-memory fallback).
- read_macro_snapshot(): deserialise from cache, attach freshness metadata
  (status / age_seconds / stale flag).
- build_pending_response(): fast payload returned when no snapshot exists yet.

This module has NO awareness of Flask request context.  It is safe to call
from background threads.
"""
from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.utils.logger import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MACRO_SNAPSHOT_KEY = "macro:snapshot:v1"
MACRO_SNAPSHOT_TTL = 7200          # Redis TTL safety net: 2 h
STALE_THRESHOLD_SECONDS = 1200     # 20 min — above this → "stale"
WORKER_INTERVAL_DEFAULT = 900      # 15 min default refresh cycle


# ---------------------------------------------------------------------------
# Snapshot schema helpers
# ---------------------------------------------------------------------------

def _empty_overview() -> Dict[str, Any]:
    return {"indices": [], "forex": [], "crypto": [], "commodities": [], "timestamp": 0}


def _empty_heatmap() -> Dict[str, Any]:
    return {"crypto": [], "sectors": [], "forex": [], "commodities": [], "indices": []}


def _empty_news() -> Dict[str, Any]:
    return {"cn": [], "en": []}


def _empty_sentiment() -> Dict[str, Any]:
    return {
        "fear_greed": {},
        "vix": {},
        "dxy": {},
        "yield_curve": {},
        "vxn": {},
        "gvz": {},
        "vix_term": {},
        "timestamp": 0,
    }


def _empty_dimensions() -> Dict[str, Any]:
    """
    Placeholder dimension blocks — Layer 2 content will populate these in a
    future iteration.  The keys are stable so the frontend schema never breaks.
    """
    return {
        "liquidity": {"summary": None, "key_metrics": {}},
        "economy": {"summary": None, "key_metrics": {}},
        "inflation_rates": {"summary": None, "key_metrics": {}},
        "sentiment_dim": {"summary": None, "key_metrics": {}},
    }


def _empty_layer1() -> Dict[str, Any]:
    """Layer 1 summary — populated by future AI narrative step."""
    return {
        "verdict": None,
        "thesis": None,
        "headline_metrics": {},
        "dimension_states": {},
    }


# ---------------------------------------------------------------------------
# Generator
# ---------------------------------------------------------------------------

def generate_macro_snapshot() -> Dict[str, Any]:
    """
    Collect all macro data sections in parallel, normalise into a canonical
    snapshot dict, and return it with generation metadata.

    Failures in individual sections do NOT abort the whole snapshot.
    Missing sections are recorded in ``meta.sources_failed``.
    """
    t_start = time.monotonic()
    logger.info("[MacroSnapshot] Generation started")

    snapshot: Dict[str, Any] = {
        "status": "ready",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "age_seconds": 0,
        "stale": False,
        "missing_sections": [],
        "meta": {
            "generation_duration_s": 0.0,
            "sources_ok": [],
            "sources_failed": [],
        },
        "overview": _empty_overview(),
        "heatmap": _empty_heatmap(),
        "news": _empty_news(),
        "calendar": [],
        "sentiment": _empty_sentiment(),
        "liquidity": {},
        "economy": {},
        "inflation_rates": {},
        "dimensions": _empty_dimensions(),
        "layer1": _empty_layer1(),
        "regime": {},
    }

    # ------------------------------------------------------------------ #
    # Section collectors — each returns (section_name, data_or_None)      #
    # ------------------------------------------------------------------ #

    def _collect_overview():
        from concurrent.futures import ThreadPoolExecutor as _TPE, as_completed as _ac
        from app.data_providers.indices import fetch_stock_indices
        from app.data_providers.forex import fetch_forex_pairs
        from app.data_providers.crypto import fetch_crypto_prices
        from app.data_providers.commodities import fetch_commodities

        result = _empty_overview()
        result["timestamp"] = int(time.time())

        sub_futures = {}
        with _TPE(max_workers=4) as ex:
            sub_futures = {
                ex.submit(fetch_stock_indices): "indices",
                ex.submit(fetch_forex_pairs): "forex",
                ex.submit(fetch_crypto_prices): "crypto",
                ex.submit(fetch_commodities): "commodities",
            }
            for fut in _ac(sub_futures):
                key = sub_futures[fut]
                try:
                    data = fut.result()
                    result[key] = data if data else []
                    logger.debug("[MacroSnapshot] overview.%s: %d items", key, len(result[key]))
                except Exception as exc:
                    logger.warning("[MacroSnapshot] overview.%s failed: %s", key, exc)
                    result[key] = []

        return "overview", result

    def _collect_heatmap():
        from app.data_providers.heatmap import generate_heatmap_data
        data = generate_heatmap_data()
        return "heatmap", data

    def _collect_news():
        from app.data_providers.news import fetch_financial_news
        data = fetch_financial_news("all")
        return "news", data

    def _collect_calendar():
        from app.data_providers.news import get_economic_calendar
        data = get_economic_calendar()
        return "calendar", data

    def _collect_sentiment():
        from concurrent.futures import ThreadPoolExecutor as _TPE, as_completed as _ac
        from app.data_providers.sentiment import (
            fetch_fear_greed_index, fetch_vix, fetch_dollar_index,
            fetch_yield_curve, fetch_vxn, fetch_gvz, fetch_put_call_ratio,
        )

        result = _empty_sentiment()
        result["timestamp"] = int(time.time())

        tasks = {
            "fear_greed": fetch_fear_greed_index,
            "vix": fetch_vix,
            "dxy": fetch_dollar_index,
            "yield_curve": fetch_yield_curve,
            "vxn": fetch_vxn,
            "gvz": fetch_gvz,
            "vix_term": fetch_put_call_ratio,
        }
        with _TPE(max_workers=7) as ex:
            sub_futures = {ex.submit(fn): key for key, fn in tasks.items()}
            for fut in _ac(sub_futures):
                key = sub_futures[fut]
                try:
                    result[key] = fut.result() or {}
                    logger.debug("[MacroSnapshot] sentiment.%s OK", key)
                except Exception as exc:
                    logger.warning("[MacroSnapshot] sentiment.%s failed: %s", key, exc)
                    result[key] = {}

        return "sentiment", result

    def _collect_liquidity():
        try:
            from app.data_providers.liquidity import fetch_all_liquidity
            data = fetch_all_liquidity()
            return "liquidity", data
        except Exception as exc:
            logger.warning("[MacroSnapshot] liquidity failed: %s", exc)
            return "liquidity", {}

    def _collect_economy():
        try:
            from app.data_providers.economy import fetch_all_economy
            data = fetch_all_economy()
            return "economy", data
        except Exception as exc:
            logger.warning("[MacroSnapshot] economy failed: %s", exc)
            return "economy", {}

    def _collect_inflation_rates():
        try:
            from app.data_providers.inflation import fetch_all_inflation_rates
            data = fetch_all_inflation_rates()
            return "inflation_rates", data
        except Exception as exc:
            logger.warning("[MacroSnapshot] inflation_rates failed: %s", exc)
            return "inflation_rates", {}

    # ------------------------------------------------------------------ #
    # Run all section collectors in parallel                               #
    # ------------------------------------------------------------------ #

    collectors = [
        _collect_overview,
        _collect_heatmap,
        _collect_news,
        _collect_calendar,
        _collect_sentiment,
        _collect_liquidity,
        _collect_economy,
        _collect_inflation_rates,
    ]

    with ThreadPoolExecutor(max_workers=8, thread_name_prefix="macro_snap") as executor:
        section_futures = {executor.submit(fn): fn.__name__ for fn in collectors}

        for future in as_completed(section_futures):
            fn_name = section_futures[future]
            try:
                section_name, section_data = future.result()
                snapshot[section_name] = section_data
                snapshot["meta"]["sources_ok"].append(section_name)
                logger.info("[MacroSnapshot] ✓ %s collected", section_name)
            except Exception as exc:
                logger.error(
                    "[MacroSnapshot] ✗ %s raised unexpectedly: %s",
                    fn_name, exc, exc_info=True,
                )
                # Derive section_name from function name heuristic
                section_name = fn_name.replace("_collect_", "")
                snapshot["meta"]["sources_failed"].append(section_name)
                snapshot["missing_sections"].append(section_name)

    # ------------------------------------------------------------------ #
    # Derive top-level headline metrics for Layer 1 (best-effort)         #
    # ------------------------------------------------------------------ #
    try:
        snapshot["layer1"]["headline_metrics"] = _build_headline_metrics(snapshot)
    except Exception:
        pass

    # ------------------------------------------------------------------ #
    # Classify Rule-Based Regimes                                         #
    # ------------------------------------------------------------------ #
    try:
        from app.services.macro_regime import classify_macro_regime
        snapshot["regime"] = classify_macro_regime(snapshot)
    except Exception as exc:
        logger.error("[MacroSnapshot] Regime classification failed: %s", exc, exc_info=True)
        snapshot["regime"] = {}

    # Mark status
    if snapshot["missing_sections"]:
        snapshot["status"] = "degraded"

    elapsed = round(time.monotonic() - t_start, 2)
    snapshot["meta"]["generation_duration_s"] = elapsed

    logger.info(
        "[MacroSnapshot] Generation complete in %.1fs — status=%s, ok=%s, failed=%s",
        elapsed,
        snapshot["status"],
        snapshot["meta"]["sources_ok"],
        snapshot["meta"]["sources_failed"],
    )

    return snapshot


def _build_headline_metrics(snapshot: Dict[str, Any]) -> Dict[str, Any]:
    """Extract key scalar metrics from the snapshot for Layer 1 summary."""
    metrics: Dict[str, Any] = {}

    sent = snapshot.get("sentiment") or {}
    if sent.get("fear_greed"):
        metrics["fear_greed_value"] = sent["fear_greed"].get("value")
        metrics["fear_greed_label"] = sent["fear_greed"].get("classification")
    if sent.get("vix"):
        metrics["vix"] = sent["vix"].get("value")
        metrics["vix_level"] = sent["vix"].get("level")
    if sent.get("dxy"):
        metrics["dxy"] = sent["dxy"].get("value")
    if sent.get("yield_curve"):
        metrics["yield_spread"] = sent["yield_curve"].get("spread")
        metrics["yield_signal"] = sent["yield_curve"].get("signal")

    ovr = snapshot.get("overview") or {}
    indices: List[Dict] = ovr.get("indices") or []
    for idx in indices:
        sym = idx.get("symbol", "")
        if sym == "^GSPC":
            metrics["sp500_price"] = idx.get("price")
            metrics["sp500_change"] = idx.get("change")
        elif sym == "^IXIC":
            metrics["nasdaq_price"] = idx.get("price")
            metrics["nasdaq_change"] = idx.get("change")

    return metrics


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

def write_macro_snapshot(snapshot: Dict[str, Any]) -> bool:
    """
    Write the snapshot to CacheManager (Redis or in-memory fallback).

    Returns True on success, False on failure.
    """
    try:
        from app.utils.cache import CacheManager
        cm = CacheManager()
        cm.set(MACRO_SNAPSHOT_KEY, snapshot, ttl=MACRO_SNAPSHOT_TTL)
        logger.info(
            "[MacroSnapshot] Written to cache (key=%s, ttl=%ds, status=%s)",
            MACRO_SNAPSHOT_KEY, MACRO_SNAPSHOT_TTL, snapshot.get("status"),
        )
        return True
    except Exception as exc:
        logger.error("[MacroSnapshot] Cache write failed: %s", exc, exc_info=True)
        return False


def read_macro_snapshot() -> Optional[Dict[str, Any]]:
    """
    Read the current snapshot from cache and attach freshness metadata.

    Returns None if no snapshot exists.
    Returns the snapshot dict with ``status``, ``age_seconds``, and ``stale``
    recalculated from the current wall-clock time.
    """
    try:
        from app.utils.cache import CacheManager
        cm = CacheManager()
        snapshot = cm.get(MACRO_SNAPSHOT_KEY)
    except Exception as exc:
        logger.error("[MacroSnapshot] Cache read failed: %s", exc)
        return None

    if not snapshot:
        return None

    # Recalculate freshness on every read
    generated_at_str = snapshot.get("generated_at")
    age_seconds: float = 0.0
    if generated_at_str:
        try:
            generated_at = datetime.fromisoformat(generated_at_str)
            if generated_at.tzinfo is None:
                generated_at = generated_at.replace(tzinfo=timezone.utc)
            age_seconds = (datetime.now(timezone.utc) - generated_at).total_seconds()
        except Exception:
            pass

    snapshot["age_seconds"] = round(age_seconds)
    snapshot["stale"] = age_seconds >= STALE_THRESHOLD_SECONDS

    # Recalculate status (could have gone stale since generation)
    if snapshot.get("missing_sections"):
        snapshot["status"] = "degraded"
    elif snapshot["stale"]:
        snapshot["status"] = "stale"
    else:
        snapshot["status"] = "ready"

    return snapshot


# ---------------------------------------------------------------------------
# Fast fallback response builder
# ---------------------------------------------------------------------------

def build_pending_response() -> Dict[str, Any]:
    """Return a fast 'snapshot not yet ready' payload."""
    return {
        "status": "pending",
        "generated_at": None,
        "age_seconds": None,
        "stale": None,
        "message": (
            "Macro snapshot is being generated in the background. "
            "Please retry in a few seconds."
        ),
        "missing_sections": [],
        "overview": None,
        "heatmap": None,
        "news": None,
        "calendar": None,
        "sentiment": None,
        "liquidity_us": None,
        "dimensions": None,
        "layer1": None,
    }


def snapshot_meta(snapshot: Dict[str, Any]) -> Dict[str, Any]:
    """Extract only the metadata fields for the ``_snapshot_meta`` API field."""
    return {
        "status": snapshot.get("status"),
        "generated_at": snapshot.get("generated_at"),
        "age_seconds": snapshot.get("age_seconds"),
        "stale": snapshot.get("stale"),
        "missing_sections": snapshot.get("missing_sections", []),
    }
