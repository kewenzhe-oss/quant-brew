import pandas as pd
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from app.utils.logger import get_logger
from app.utils.fred import fetch_fred_series
from app.data_providers.fallback import resolve_metric_value

logger = get_logger(__name__)

def fetch_us_liquidity_components(old_snap=None) -> Dict[str, Any]:
    """
    Fetch US Liquidity components from FRED and compute US Net Liquidity.
    Returns:
        dict: Canonical Macro metrics for liquidity.us
    """
    result = {}
    
    # 1. fed_balance_sheet (WALCL: Millions -> Billions)
    def _fetch_walcl():
        res = fetch_fred_series("WALCL")
        if isinstance(res, dict) and res.get("status") == "ok" and res.get("value") is not None:
            res["value"] = res["value"] / 1000.0
            res["unit"] = "B"
        return res
        
    walcl_resolved = resolve_metric_value(
        metric_key="fed_balance_sheet",
        section_name="liquidity",
        primary_fetcher=_fetch_walcl,
        default_source="FRED",
        old_snap=old_snap,
        unit="B"
    )
    result["fed_balance_sheet"] = walcl_resolved
    fed_balance_sheet = walcl_resolved.get("value")
    
    # 2. tga_balance (WTREGEN: Millions -> Billions)
    def _fetch_tga():
        res = fetch_fred_series("WTREGEN")
        if isinstance(res, dict) and res.get("status") == "ok" and res.get("value") is not None:
            res["value"] = res["value"] / 1000.0
            res["unit"] = "B"
        return res
        
    tga_resolved = resolve_metric_value(
        metric_key="tga_balance",
        section_name="liquidity",
        primary_fetcher=_fetch_tga,
        default_source="FRED",
        old_snap=old_snap,
        unit="B"
    )
    result["tga_balance"] = tga_resolved
    tga_val = tga_resolved.get("value")
    
    # 3. rrp_balance (RRPONTSYD: Billions)
    def _fetch_rrp():
        res = fetch_fred_series("RRPONTSYD")
        if isinstance(res, dict):
            res["unit"] = "B"
        return res

    def _rrp_bootstrap():
        """Bootstrap constant — used only when FRED is down and no snapshot exists yet.
        Marked stale so the UI badge correctly indicates this is a fallback value."""
        return {
            "value": 100.0,
            "unit": "B",
            "source": "FRED (bootstrap estimate)",
            "source_type": "cached",
            "as_of": "2025-01-01",
            "status": "ok",
            "error": None,
            "is_stale": True
        }
        
    rrp_resolved = resolve_metric_value(
        metric_key="rrp_balance",
        section_name="liquidity",
        primary_fetcher=_fetch_rrp,
        fallback_fetcher=_rrp_bootstrap,
        default_source="FRED",
        old_snap=old_snap,
        unit="B"
    )
    result["rrp_balance"] = rrp_resolved
    rrp_val = rrp_resolved.get("value")
    
    # 4. bank_reserves (WRESBAL: Millions -> Billions)
    def _fetch_reserves():
        res = fetch_fred_series("WRESBAL")
        if isinstance(res, dict) and res.get("status") == "ok" and res.get("value") is not None:
            res["value"] = res["value"] / 1000.0
            res["unit"] = "B"
        return res
        
    reserves_resolved = resolve_metric_value(
        metric_key="bank_reserves",
        section_name="liquidity",
        primary_fetcher=_fetch_reserves,
        default_source="FRED",
        old_snap=old_snap,
        unit="B"
    )
    result["bank_reserves"] = reserves_resolved
    
    # 5. nfci
    def _fetch_nfci():
        res = fetch_fred_series("NFCI")
        if isinstance(res, dict):
            res["unit"] = "Index"
        return res

    def _nfci_bootstrap():
        """Bootstrap constant — NFCI has no alternative public source.
        Used only when FRED is down and no snapshot exists. Marked stale."""
        return {
            "value": -0.10,
            "unit": "Index",
            "source": "FRED (bootstrap estimate)",
            "source_type": "cached",
            "as_of": "2025-01-01",
            "status": "ok",
            "error": None,
            "is_stale": True
        }

    nfci_resolved = resolve_metric_value(
        metric_key="nfci",
        section_name="liquidity",
        primary_fetcher=_fetch_nfci,
        fallback_fetcher=_nfci_bootstrap,
        default_source="Chicago Fed / FRED",
        old_snap=old_snap,
        unit="Index"
    )
    result["nfci"] = nfci_resolved
    
    # US Net Liquidity = Fed Balance Sheet - TGA - RRP
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    def _calc_net_liq():
        if fed_balance_sheet is not None and tga_val is not None and rrp_val is not None:
            us_net_liquidity = fed_balance_sheet - tga_val - rrp_val
            return {
                "value": us_net_liquidity,
                "unit": "B",
                "asOf": walcl_resolved.get("as_of") or walcl_resolved.get("asOf") or now_iso,
                "source": "calculated",
                "seriesId": "US_NET_LIQ",
                "status": "ok",
                "error": None
            }
        return {"status": "error", "error": "Missing one or more components for calculation"}
        
    net_liq_resolved = resolve_metric_value(
        metric_key="us_net_liquidity",
        section_name="liquidity",
        primary_fetcher=_calc_net_liq,
        default_source="calculated",
        old_snap=old_snap,
        unit="B"
    )
    result["us_net_liquidity"] = net_liq_resolved
    
    return result

def fetch_global_liquidity_components(old_snap=None) -> Dict[str, Any]:
    """Fetch liquidity.global metrics."""
    result = {}
    
    # 1. boj_balance_sheet
    def _fetch_boj_bs():
        res = fetch_fred_series("JPNASSETS")
        if res.get("value") is not None:
            res["value"] = res["value"] / 10000.0
        res["unit"] = "T JPY"
        return res
    result["boj_balance_sheet"] = resolve_metric_value(
        metric_key="boj_balance_sheet",
        section_name="liquidity",
        primary_fetcher=_fetch_boj_bs,
        default_source="FRED",
        old_snap=old_snap,
        unit="T JPY"
    )
    
    # 2. boj_policy_rate
    def _fetch_boj_rate():
        res = fetch_fred_series("INTDSRJPM193N")
        res["unit"] = "%"
        return res
    result["boj_policy_rate"] = resolve_metric_value(
        metric_key="boj_policy_rate",
        section_name="liquidity",
        primary_fetcher=_fetch_boj_rate,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )
    
    # 3. ecb_balance_sheet
    def _fetch_ecb_bs():
        res = fetch_fred_series("ECBASSETSW")
        if res.get("value") is not None:
            res["value"] = res["value"] / 1000000.0
        res["unit"] = "T EUR"
        return res
    result["ecb_balance_sheet"] = resolve_metric_value(
        metric_key="ecb_balance_sheet",
        section_name="liquidity",
        primary_fetcher=_fetch_ecb_bs,
        default_source="FRED",
        old_snap=old_snap,
        unit="T EUR"
    )
    
    # 4. ecb_deposit_rate
    def _fetch_ecb_rate():
        res = fetch_fred_series("ECBDFR")
        res["unit"] = "%"
        return res
    result["ecb_deposit_rate"] = resolve_metric_value(
        metric_key="ecb_deposit_rate",
        section_name="liquidity",
        primary_fetcher=_fetch_ecb_rate,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )
    
    # 5. global_m2_proxy
    def _fetch_m2():
        res = fetch_fred_series("WM2NS")
        if res.get("value") is not None:
            res["value"] = res["value"] / 1000.0
        res["unit"] = "T USD"
        return res
    result["global_m2_proxy"] = resolve_metric_value(
        metric_key="global_m2_proxy",
        section_name="liquidity",
        primary_fetcher=_fetch_m2,
        default_source="FRED",
        old_snap=old_snap,
        unit="T USD"
    )
    
    # 6. usd_jpy
    def _fetch_usd_jpy():
        return fetch_fred_series("DEXJPUS")
    result["usd_jpy"] = resolve_metric_value(
        metric_key="usd_jpy",
        section_name="liquidity",
        primary_fetcher=_fetch_usd_jpy,
        default_source="FRED",
        old_snap=old_snap
    )
    
    # 7. eur_usd
    def _fetch_eur_usd():
        return fetch_fred_series("DEXUSEU")
    result["eur_usd"] = resolve_metric_value(
        metric_key="eur_usd",
        section_name="liquidity",
        primary_fetcher=_fetch_eur_usd,
        default_source="FRED",
        old_snap=old_snap
    )
    
    return result

def fetch_all_liquidity(old_snap=None) -> Dict[str, Any]:
    """Fetch all liquidity components (US + Global)."""
    logger.info("Fetching Liquidity metrics...")
    us_liq = fetch_us_liquidity_components(old_snap=old_snap)
    global_liq = fetch_global_liquidity_components(old_snap=old_snap)
    
    return {
        **us_liq,
        **global_liq
    }
