from typing import Dict, Any
from app.utils.fred import fetch_fred_series
from app.utils.logger import get_logger

logger = get_logger(__name__)

def fetch_economy_growth() -> Dict[str, Any]:
    """Fetch economy.growth metrics."""
    result = {}
    
    # ISM Manufacturing (PMI) - Removed due to FRED restriction
    result["ism_manufacturing"] = {"value": None, "status": "error", "error": "Discontinued on FRED free tier"}
    
    # Retail Sales YoY
    res = fetch_fred_series("RSXFS", mode="yoy")
    res["unit"] = "%"
    result["retail_sales_yoy"] = res
    
    # Industrial Production YoY
    res = fetch_fred_series("INDPRO", mode="yoy")
    res["unit"] = "%"
    result["industrial_production_yoy"] = res
    
    # GDP Growth (Real GDP Percent Change from Preceding Period, Annualized)
    res = fetch_fred_series("A191RL1Q225SBEA")
    res["unit"] = "%"
    result["gdp_growth"] = res
    
    # Consumer Confidence (University of Michigan)
    res = fetch_fred_series("UMCSENT")
    result["consumer_confidence"] = res
    
    # LEI - Removed as USSLIND is an incorrect proxy (State-level vs National)
    result["leading_economic_index"] = {"value": None, "status": "error", "error": "Unavailable via free tier"}
    
    # Recession Probability (Smoothed U.S. Recession Probabilities)
    res = fetch_fred_series("RECPROUSM156N")
    res["unit"] = "%"
    result["recession_probability"] = res

    return result

def fetch_economy_employment() -> Dict[str, Any]:
    """Fetch economy.employment metrics."""
    result = {}
    
    res = fetch_fred_series("UNRATE")
    res["unit"] = "%"
    result["unemployment_rate"] = res
    
    res = fetch_fred_series("PAYEMS", mode="diff")
    res["unit"] = "K" # Thousands
    result["nonfarm_payrolls"] = res
    
    res = fetch_fred_series("ICSA")
    if res["value"] is not None:
        res["value"] = res["value"] / 1000.0
    res["unit"] = "K"
    result["initial_jobless_claims"] = res
    
    res = fetch_fred_series("CCSA")
    if res["value"] is not None:
        res["value"] = res["value"] / 1000.0
    res["unit"] = "K"
    result["continuing_claims"] = res
    
    res = fetch_fred_series("JTSJOL")
    if res["value"] is not None:
        res["value"] = res["value"] / 1000.0
    res["unit"] = "M"
    result["jolts_openings"] = res
    
    res = fetch_fred_series("CES0500000003", mode="yoy")
    res["unit"] = "%"
    result["wage_growth"] = res
    
    res = fetch_fred_series("CIVPART")
    res["unit"] = "%"
    result["labor_force_participation"] = res
    
    res = fetch_fred_series("CES0500000003")
    res["unit"] = "$"
    result["average_hourly_earnings"] = res
    
    return result

def fetch_economy_credit() -> Dict[str, Any]:
    """Fetch economy.credit metrics."""
    result = {}
    
    res = fetch_fred_series("BAMLH0A0HYM2")
    res["unit"] = "%"
    result["hy_spread"] = res
    
    res = fetch_fred_series("BAMLC0A0CM")
    res["unit"] = "%"
    result["ig_spread"] = res
    
    res = fetch_fred_series("DRTSCILM")
    res["unit"] = "%"
    result["bank_lending_standards"] = res
    
    res = fetch_fred_series("DRCCLACBS")
    res["unit"] = "%"
    result["delinquency_rate"] = res
    
    res = fetch_fred_series("COMPAPFF")
    res["unit"] = "%"
    result["commercial_paper_spread"] = res
    
    return result

def fetch_all_economy() -> Dict[str, Any]:
    """Fetch all economy components."""
    logger.info("Fetching Economy metrics...")
    growth = fetch_economy_growth()
    employment = fetch_economy_employment()
    credit = fetch_economy_credit()
    
    return {
        **growth,
        **employment,
        **credit
    }
