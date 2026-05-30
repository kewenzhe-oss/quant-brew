from typing import Dict, Any
from app.utils.fred import fetch_fred_series
from app.utils.logger import get_logger
from app.data_providers.fallback import resolve_metric_value

logger = get_logger(__name__)

def fetch_economy_growth(old_snap=None) -> Dict[str, Any]:
    """Fetch economy.growth metrics."""
    result = {}
    
    # ISM Manufacturing (PMI) - Removed due to FRED restriction
    result["ism_manufacturing"] = {"value": None, "status": "error", "error": "Discontinued on FRED free tier"}
    
    # Retail Sales YoY
    def _fetch():
        return fetch_fred_series("RSXFS", mode="yoy")
    result["retail_sales_yoy"] = resolve_metric_value(
        metric_key="retail_sales_yoy",
        section_name="economy",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )
    
    # Industrial Production YoY
    def _fetch():
        return fetch_fred_series("INDPRO", mode="yoy")
    result["industrial_production_yoy"] = resolve_metric_value(
        metric_key="industrial_production_yoy",
        section_name="economy",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )
    
    # GDP Growth
    def _fetch():
        return fetch_fred_series("A191RL1Q225SBEA")
    result["gdp_growth"] = resolve_metric_value(
        metric_key="gdp_growth",
        section_name="economy",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )
    
    # Consumer Confidence
    def _fetch():
        return fetch_fred_series("UMCSENT")
    result["consumer_confidence"] = resolve_metric_value(
        metric_key="consumer_confidence",
        section_name="economy",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap
    )
    
    # LEI - Removed
    result["leading_economic_index"] = {"value": None, "status": "error", "error": "Unavailable via free tier"}
    
    # Recession Probability
    def _fetch():
        return fetch_fred_series("RECPROUSM156N")
    result["recession_probability"] = resolve_metric_value(
        metric_key="recession_probability",
        section_name="economy",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )

    return result

def fetch_economy_employment(old_snap=None) -> Dict[str, Any]:
    """Fetch economy.employment metrics."""
    result = {}
    
    # Unemployment Rate
    def _fetch():
        return fetch_fred_series("UNRATE")
    result["unemployment_rate"] = resolve_metric_value(
        metric_key="unemployment_rate",
        section_name="economy",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )
    
    # Nonfarm Payrolls
    def _fetch():
        return fetch_fred_series("PAYEMS", mode="diff")
    result["nonfarm_payrolls"] = resolve_metric_value(
        metric_key="nonfarm_payrolls",
        section_name="economy",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="K"
    )
    
    # Initial Jobless Claims
    def _fetch():
        res = fetch_fred_series("ICSA")
        if res.get("value") is not None:
            res["value"] = res["value"] / 1000.0
        res["unit"] = "K"
        return res
    result["initial_jobless_claims"] = resolve_metric_value(
        metric_key="initial_jobless_claims",
        section_name="economy",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="K"
    )
    
    # Continuing Claims
    def _fetch():
        res = fetch_fred_series("CCSA")
        if res.get("value") is not None:
            res["value"] = res["value"] / 1000.0
        res["unit"] = "K"
        return res
    result["continuing_claims"] = resolve_metric_value(
        metric_key="continuing_claims",
        section_name="economy",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="K"
    )
    
    # Jolts Openings
    def _fetch():
        res = fetch_fred_series("JTSJOL")
        if res.get("value") is not None:
            res["value"] = res["value"] / 1000.0
        res["unit"] = "M"
        return res
    result["jolts_openings"] = resolve_metric_value(
        metric_key="jolts_openings",
        section_name="economy",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="M"
    )
    
    # Wage Growth
    def _fetch():
        return fetch_fred_series("CES0500000003", mode="yoy")
    result["wage_growth"] = resolve_metric_value(
        metric_key="wage_growth",
        section_name="economy",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )
    
    # Labor Force Participation
    def _fetch():
        return fetch_fred_series("CIVPART")
    result["labor_force_participation"] = resolve_metric_value(
        metric_key="labor_force_participation",
        section_name="economy",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )
    
    # Average Hourly Earnings
    def _fetch():
        return fetch_fred_series("CES0500000003")
    result["average_hourly_earnings"] = resolve_metric_value(
        metric_key="average_hourly_earnings",
        section_name="economy",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="$"
    )
    
    return result

def fetch_economy_credit(old_snap=None) -> Dict[str, Any]:
    """Fetch economy.credit metrics."""
    result = {}
    
    # High Yield Spread
    def _fetch():
        return fetch_fred_series("BAMLH0A0HYM2")
    result["hy_spread"] = resolve_metric_value(
        metric_key="hy_spread",
        section_name="economy",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )
    
    # Investment Grade Spread
    def _fetch():
        return fetch_fred_series("BAMLC0A0CM")
    result["ig_spread"] = resolve_metric_value(
        metric_key="ig_spread",
        section_name="economy",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )
    
    # Bank Lending Standards
    def _fetch():
        return fetch_fred_series("DRTSCILM")
    result["bank_lending_standards"] = resolve_metric_value(
        metric_key="bank_lending_standards",
        section_name="economy",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )
    
    # Delinquency Rate
    def _fetch():
        return fetch_fred_series("DRCCLACBS")
    result["delinquency_rate"] = resolve_metric_value(
        metric_key="delinquency_rate",
        section_name="economy",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )
    
    # Commercial Paper Spread
    def _fetch():
        return fetch_fred_series("CPFF")
    result["commercial_paper_spread"] = resolve_metric_value(
        metric_key="commercial_paper_spread",
        section_name="economy",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )
    
    return result

def fetch_all_economy(old_snap=None) -> Dict[str, Any]:
    """Fetch all economy components."""
    logger.info("Fetching Economy metrics...")
    growth = fetch_economy_growth(old_snap=old_snap)
    employment = fetch_economy_employment(old_snap=old_snap)
    credit = fetch_economy_credit(old_snap=old_snap)
    
    return {
        **growth,
        **employment,
        **credit
    }
