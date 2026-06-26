from datetime import datetime, timezone
from typing import Any, Dict, Callable
from app.utils.logger import get_logger

logger = get_logger(__name__)

def resolve_metric_value(
    metric_key: str,
    section_name: str,
    primary_fetcher: Callable[[], Any],
    fallback_fetcher: Callable[[], Any] = None,
    unit: str = None,
    default_source: str = None,
    old_snap: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Resolves a macro metric value by attempting:
    1. Primary fetcher
    2. Fallback fetcher
    3. Last-known cached snapshot
    4. Return error structure if all fail.
    
    Normalizes the output structure to:
    {
        "value": float/int or None,
        "unit": str or None,
        "source": str,
        "source_type": "primary" | "fallback" | "cached",
        "as_of": "YYYY-MM-DD" or ISO string,
        "date": "YYYY-MM-DD" or ISO string,   # compatibility
        "asOf": "YYYY-MM-DD" or ISO string,   # compatibility
        "is_stale": bool,
        "status": "ok" | "error",
        "error": str or None,
        # plus any extra keys returned by the fetcher (like change, level, interpretation, etc.)
    }
    """
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    def extract_clean_metric(data: Any, default_source_type: str) -> Dict[str, Any]:
        if not data:
            return None
            
        if not isinstance(data, dict):
            # If the fetcher returned a raw number/string (unlikely but let's be safe)
            return {
                "value": data,
                "unit": unit,
                "source": default_source or "Unknown",
                "source_type": default_source_type,
                "as_of": now_str,
                "date": now_str,
                "asOf": now_str,
                "fetched_at": now_iso,
                "is_stale": False,
                "status": "ok",
                "error": None
            }
        
        # If it's already an error dict, return None to trigger next fallback
        if data.get("status") == "error":
            return None
            
        val = data.get("value")
        if val is None:
            return None
            
        # Determine source
        src = data.get("source") or default_source or "Unknown"
        
        # Determine as_of date
        as_of_val = data.get("as_of") or data.get("asOf")
        if not as_of_val:
            ts = data.get("timestamp")
            if ts:
                try:
                    ts_float = float(ts)
                    if ts_float > 1e11:  # milliseconds
                        ts_float = ts_float / 1000.0
                    if ts_float > 0:
                        as_of_val = datetime.fromtimestamp(ts_float, tz=timezone.utc).strftime("%Y-%m-%d")
                except (ValueError, TypeError):
                    pass
        if not as_of_val:
            as_of_val = now_str
            
        # Build normalized result
        res = {
            "value": val,
            "unit": unit or data.get("unit"),
            "source": src,
            "source_type": data.get("source_type") or default_source_type,
            "as_of": as_of_val,
            "date": as_of_val,
            "asOf": as_of_val,
            "fetched_at": data.get("fetched_at") or now_iso,
            "is_stale": data.get("is_stale", False),
            "status": "ok",
            "error": None
        }
        
        # Merge extra keys (e.g. change, level, interpretation, classification, etc.)
        for k, v in data.items():
            if k not in res and k not in ["date", "asOf", "as_of"]:
                res[k] = v
                
        return res

    # 1. Try Primary
    try:
        data = primary_fetcher()
        clean = extract_clean_metric(data, "primary")
        if clean:
            logger.info(f"[FallbackResolver] Resolved {metric_key} via primary fetcher.")
            return clean
    except Exception as e:
        logger.warning(f"[FallbackResolver] Primary fetch failed for metric {metric_key} in section {section_name}: {e}")
        
    # 2. Try Fallback Fetcher
    if fallback_fetcher:
        try:
            data = fallback_fetcher()
            clean = extract_clean_metric(data, "fallback")
            if clean:
                logger.info(f"[FallbackResolver] Resolved {metric_key} via fallback fetcher.")
                return clean
        except Exception as e:
            logger.warning(f"[FallbackResolver] Fallback fetch failed for metric {metric_key} in section {section_name}: {e}")
            
    # 3. Try Cached Snapshot
    if old_snap:
        cached_section = old_snap.get(section_name) or {}
        cached_data = cached_section.get(metric_key)
        if cached_data:
            try:
                val = cached_data.get("value")
                if val is not None:
                    as_of_val = cached_data.get("as_of") or cached_data.get("asOf") or now_str
                    res = {
                        "value": val,
                        "unit": unit or cached_data.get("unit"),
                        "source": cached_data.get("source") or default_source or "Cached",
                        "source_type": "cached",
                        "as_of": as_of_val,
                        "date": as_of_val,
                        "asOf": as_of_val,
                        "fetched_at": cached_data.get("fetched_at") or now_iso,
                        "is_stale": True,
                        "status": "ok",
                        "error": None
                    }
                    # Merge extra keys
                    for k, v in cached_data.items():
                        if k not in res and k not in ["date", "asOf", "as_of"]:
                            res[k] = v
                    logger.info(f"[FallbackResolver] Resolved {metric_key} via cached snapshot.")
                    return res
            except Exception as e:
                logger.warning(f"[FallbackResolver] Failed to extract cached metric {metric_key}: {e}")

    # 4. Fallback to default/error payload if everything failed
    logger.error(f"[FallbackResolver] All recovery attempts failed for {metric_key} in section {section_name}.")
    return {
        "value": None,
        "unit": unit,
        "source": default_source or "Unknown",
        "source_type": "primary",
        "as_of": now_str,
        "date": now_str,
        "asOf": now_str,
        "fetched_at": now_iso,
        "is_stale": False,
        "status": "error",
        "error": "Data unavailable after primary, fallback, and cached attempts."
    }
