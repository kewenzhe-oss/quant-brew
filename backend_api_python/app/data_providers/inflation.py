from typing import Dict, Any
from app.utils.fred import fetch_fred_series
from app.utils.logger import get_logger

logger = get_logger(__name__)

def fetch_inflation_components() -> Dict[str, Any]:
    """Fetch inflationRates.inflation metrics."""
    result = {}
    
    res = fetch_fred_series("CPIAUCSL", mode="yoy")
    res["unit"] = "%"
    result["cpi_yoy"] = res
    
    res = fetch_fred_series("CPILFESL", mode="yoy")
    res["unit"] = "%"
    result["core_cpi_yoy"] = res
    
    res = fetch_fred_series("PCEPI", mode="yoy")
    res["unit"] = "%"
    result["pce_yoy"] = res
    
    res = fetch_fred_series("PCEPILFE", mode="yoy")
    res["unit"] = "%"
    result["core_pce_yoy"] = res
    
    res = fetch_fred_series("PPIACO", mode="yoy")
    res["unit"] = "%"
    result["ppi_yoy"] = res
    
    res = fetch_fred_series("CUSR0000SAH1", mode="yoy") # Shelter
    res["unit"] = "%"
    result["shelter_inflation"] = res
    
    res = fetch_fred_series("CUSR0000SAS2RS", mode="yoy") # Services less rent of shelter (Supercore proxy)
    res["unit"] = "%"
    result["supercore_inflation"] = res
    
    res = fetch_fred_series("PCETRIM12M159SFRBDMAC") # Trimmed Mean PCE (12-month)
    res["unit"] = "%"
    result["trimmed_mean_pce"] = res
    
    res = fetch_fred_series("MICH") # 1-year expected inflation (Michigan)
    res["unit"] = "%"
    result["inflation_expectations_1y"] = res
    
    res = fetch_fred_series("EXPINF5YR") # 5-year expected inflation (Cleveland Fed)
    res["unit"] = "%"
    result["inflation_expectations_5y"] = res

    return result

def fetch_rates_components() -> Dict[str, Any]:
    """Fetch inflationRates.rates metrics."""
    result = {}
    
    res = fetch_fred_series("DGS10")
    res["unit"] = "%"
    result["us10y_yield"] = res
    
    res = fetch_fred_series("DGS2")
    res["unit"] = "%"
    result["us2y_yield"] = res
    
    res = fetch_fred_series("DGS30")
    res["unit"] = "%"
    result["us30y_yield"] = res
    
    res = fetch_fred_series("T10Y2Y")
    res["unit"] = "%"
    result["term_spread_10y_2y"] = res
    
    res = fetch_fred_series("DFII10")
    res["unit"] = "%"
    result["real_yield_10y"] = res
    
    res = fetch_fred_series("T10YIE")
    res["unit"] = "%"
    result["breakeven_10y"] = res
    
    res = fetch_fred_series("FEDFUNDS")
    res["unit"] = "%"
    result["fed_funds_rate"] = res
    
    res = fetch_fred_series("SOFR")
    res["unit"] = "%"
    result["sofr"] = res
    
    res = fetch_fred_series("EFFR")
    res["unit"] = "%"
    result["effective_fed_funds_rate"] = res
    
    return result

def fetch_all_inflation_rates() -> Dict[str, Any]:
    """Fetch all inflation and rates components."""
    logger.info("Fetching Inflation & Rates metrics...")
    inflation = fetch_inflation_components()
    rates = fetch_rates_components()
    
    return {
        **inflation,
        **rates
    }
