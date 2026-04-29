import pandas as pd
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from app.utils.logger import get_logger
from app.utils.fred import fetch_fred_series

logger = get_logger(__name__)

def fetch_us_liquidity_components() -> Dict[str, Any]:
    """
    Fetch US Liquidity components from FRED and compute US Net Liquidity.
    Returns:
        dict: Canonical Macro metrics for liquidity.us
    """
    result = {}
    
    # WALCL: Millions -> Billions
    walcl_res = fetch_fred_series("WALCL")
    walcl_val = walcl_res["value"]
    fed_balance_sheet = walcl_val / 1000.0 if walcl_val is not None else None
    walcl_res["value"] = fed_balance_sheet
    walcl_res["unit"] = "B"
    result["fed_balance_sheet"] = walcl_res
    
    # WTREGEN: Millions -> Billions
    tga_res = fetch_fred_series("WTREGEN")
    if tga_res["value"] is not None:
        tga_res["value"] = tga_res["value"] / 1000.0
    tga_res["unit"] = "B"
    result["tga_balance"] = tga_res
    tga_val = tga_res["value"]
    
    # RRPONTSYD: Billions
    rrp_res = fetch_fred_series("RRPONTSYD")
    rrp_res["unit"] = "B"
    result["rrp_balance"] = rrp_res
    rrp_val = rrp_res["value"]
    
    # WRESBAL: Millions -> Billions (Reserve Balances with Federal Reserve Banks)
    res_res = fetch_fred_series("WRESBAL")
    if res_res["value"] is not None:
        res_res["value"] = res_res["value"] / 1000.0
    res_res["unit"] = "B"
    result["bank_reserves"] = res_res
    
    # NFCI: National Financial Conditions Index
    nfci_res = fetch_fred_series("NFCI")
    nfci_res["unit"] = "Index"
    result["nfci"] = nfci_res
    
    # US Net Liquidity = Fed Balance Sheet - TGA - RRP
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    us_net_liquidity = None
    if fed_balance_sheet is not None and tga_val is not None and rrp_val is not None:
        us_net_liquidity = fed_balance_sheet - tga_val - rrp_val
        result["us_net_liquidity"] = {
            "value": us_net_liquidity,
            "unit": "B",
            "asOf": walcl_res["asOf"],
            "source": "calculated",
            "seriesId": "US_NET_LIQ",
            "status": "ok",
            "error": None
        }
    else:
        result["us_net_liquidity"] = {
            "value": None,
            "unit": "B",
            "asOf": now_iso,
            "source": "calculated",
            "seriesId": "US_NET_LIQ",
            "status": "error",
            "error": "Missing one or more components for calculation"
        }
        
    return result

def fetch_global_liquidity_components() -> Dict[str, Any]:
    """Fetch liquidity.global metrics."""
    result = {}
    
    res = fetch_fred_series("JPNASSETS")
    if res["value"] is not None:
        res["value"] = res["value"] / 10000.0
    res["unit"] = "T JPY"
    result["boj_balance_sheet"] = res
    
    res = fetch_fred_series("INTDSRJPM193N")
    res["unit"] = "%"
    result["boj_policy_rate"] = res
    
    res = fetch_fred_series("ECBASSETSW")
    if res["value"] is not None:
        res["value"] = res["value"] / 1000000.0
    res["unit"] = "T EUR"
    result["ecb_balance_sheet"] = res
    
    res = fetch_fred_series("ECBDFR")
    res["unit"] = "%"
    result["ecb_deposit_rate"] = res
    
    res = fetch_fred_series("WM2NS")
    if res["value"] is not None:
        res["value"] = res["value"] / 1000.0
    res["unit"] = "T USD"
    result["global_m2_proxy"] = res
    
    res = fetch_fred_series("DEXJPUS")
    result["usd_jpy"] = res
    
    res = fetch_fred_series("DEXUSEU")
    result["eur_usd"] = res
    
    # We deliberately DO NOT fetch DXY here because sentiment.py fetches the proper ICE Dollar Index (DX-Y.NYB) 
    # from Yahoo Finance. If we fetch DTWEXBGS here, it will overwrite the correct DXY in the final snapshot payload.
    
    return result

def fetch_all_liquidity() -> Dict[str, Any]:
    """Fetch all liquidity components (US + Global)."""
    logger.info("Fetching Liquidity metrics...")
    us_liq = fetch_us_liquidity_components()
    global_liq = fetch_global_liquidity_components()
    
    return {
        **us_liq,
        **global_liq
    }
