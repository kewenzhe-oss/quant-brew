from typing import Dict, Any
from app.utils.fred import fetch_fred_series
from app.utils.logger import get_logger
from app.data_providers.fallback import resolve_metric_value

logger = get_logger(__name__)

def fetch_inflation_components(old_snap=None) -> Dict[str, Any]:
    """Fetch inflationRates.inflation metrics."""
    result = {}
    
    # CPI YoY
    def _fetch():
        return fetch_fred_series("CPIAUCSL", mode="yoy")
    result["cpi_yoy"] = resolve_metric_value(
        metric_key="cpi_yoy",
        section_name="inflation_rates",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )
    
    # Core CPI YoY
    def _fetch():
        return fetch_fred_series("CPILFESL", mode="yoy")
    result["core_cpi_yoy"] = resolve_metric_value(
        metric_key="core_cpi_yoy",
        section_name="inflation_rates",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )
    
    # PCE YoY
    def _fetch():
        return fetch_fred_series("PCEPI", mode="yoy")
    result["pce_yoy"] = resolve_metric_value(
        metric_key="pce_yoy",
        section_name="inflation_rates",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )
    
    # Core PCE YoY
    def _fetch():
        return fetch_fred_series("PCEPILFE", mode="yoy")
    result["core_pce_yoy"] = resolve_metric_value(
        metric_key="core_pce_yoy",
        section_name="inflation_rates",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )
    
    # PPI YoY
    def _fetch():
        return fetch_fred_series("PPIACO", mode="yoy")
    result["ppi_yoy"] = resolve_metric_value(
        metric_key="ppi_yoy",
        section_name="inflation_rates",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )
    
    # Shelter Inflation
    def _fetch():
        return fetch_fred_series("CUSR0000SAH1", mode="yoy")
    result["shelter_inflation"] = resolve_metric_value(
        metric_key="shelter_inflation",
        section_name="inflation_rates",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )
    
    # Supercore Inflation (Services less rent of shelter)
    def _fetch():
        return fetch_fred_series("CUSR0000SAS2RS", mode="yoy")
    result["supercore_inflation"] = resolve_metric_value(
        metric_key="supercore_inflation",
        section_name="inflation_rates",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )
    
    # Trimmed Mean PCE (12-month)
    def _fetch():
        return fetch_fred_series("PCETRIM12M159SFRBDAL")
    result["trimmed_mean_pce"] = resolve_metric_value(
        metric_key="trimmed_mean_pce",
        section_name="inflation_rates",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )
    
    # 1-year expected inflation (Michigan)
    def _fetch():
        return fetch_fred_series("MICH")
    result["inflation_expectations_1y"] = resolve_metric_value(
        metric_key="inflation_expectations_1y",
        section_name="inflation_rates",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )
    
    # 5-year expected inflation (Cleveland Fed)
    def _fetch():
        return fetch_fred_series("EXPINF5YR")
    result["inflation_expectations_5y"] = resolve_metric_value(
        metric_key="inflation_expectations_5y",
        section_name="inflation_rates",
        primary_fetcher=_fetch,
        default_source="FRED",
        old_snap=old_snap,
        unit="%"
    )

    return result

def fetch_rates_components(old_snap=None) -> Dict[str, Any]:
    """Fetch inflationRates.rates metrics."""
    result = {}
    
    # US10Y Yield
    def _fetch():
        return fetch_fred_series("DGS10")
    def _fetch_fallback():
        import yfinance as yf
        from datetime import datetime, timezone
        tnx = yf.Ticker("^TNX")
        hist = tnx.history(period="5d")
        if hist is not None and not hist.empty:
            latest_date = hist.index[-1].strftime("%Y-%m-%d")
            return {
                "value": hist["Close"].iloc[-1],
                "source": "Yahoo Finance",
                "as_of": latest_date,
                "status": "ok",
                "error": None
            }
        raise ValueError("TNX failed")
    result["us10y_yield"] = resolve_metric_value(
        metric_key="us10y_yield",
        section_name="inflation_rates",
        primary_fetcher=_fetch,
        fallback_fetcher=_fetch_fallback,
        old_snap=old_snap,
        unit="%"
    )
    
    # US2Y Yield
    def _fetch():
        return fetch_fred_series("DGS2")
    result["us2y_yield"] = resolve_metric_value(
        metric_key="us2y_yield",
        section_name="inflation_rates",
        primary_fetcher=_fetch,
        old_snap=old_snap,
        unit="%"
    )
    
    # US30Y Yield
    def _fetch():
        return fetch_fred_series("DGS30")
    result["us30y_yield"] = resolve_metric_value(
        metric_key="us30y_yield",
        section_name="inflation_rates",
        primary_fetcher=_fetch,
        old_snap=old_snap,
        unit="%"
    )
    
    # Term Spread 10Y-2Y
    def _fetch():
        return fetch_fred_series("T10Y2Y")
    result["term_spread_10y_2y"] = resolve_metric_value(
        metric_key="term_spread_10y_2y",
        section_name="inflation_rates",
        primary_fetcher=_fetch,
        old_snap=old_snap,
        unit="%"
    )
    
    # Real Yield 10Y
    def _fetch():
        return fetch_fred_series("DFII10")
    result["real_yield_10y"] = resolve_metric_value(
        metric_key="real_yield_10y",
        section_name="inflation_rates",
        primary_fetcher=_fetch,
        old_snap=old_snap,
        unit="%"
    )
    
    # Breakeven 10Y
    def _fetch_breakeven():
        return fetch_fred_series("T10YIE")
    def _breakeven_bootstrap():
        """Bootstrap constant — T10YIE has no free public alternative.
        Used only when FRED is down and no snapshot exists. Marked stale."""
        return {
            "value": 2.35,
            "unit": "%",
            "source": "FRED (bootstrap estimate)",
            "source_type": "cached",
            "as_of": "2025-01-01",
            "status": "ok",
            "error": None,
            "is_stale": True
        }
    result["breakeven_10y"] = resolve_metric_value(
        metric_key="breakeven_10y",
        section_name="inflation_rates",
        primary_fetcher=_fetch_breakeven,
        fallback_fetcher=_breakeven_bootstrap,
        old_snap=old_snap,
        unit="%"
    )
    
    # Fed Funds Rate
    def _fetch():
        return fetch_fred_series("FEDFUNDS")
    result["fed_funds_rate"] = resolve_metric_value(
        metric_key="fed_funds_rate",
        section_name="inflation_rates",
        primary_fetcher=_fetch,
        old_snap=old_snap,
        unit="%"
    )
    
    # SOFR
    def _fetch():
        return fetch_fred_series("SOFR")
    result["sofr"] = resolve_metric_value(
        metric_key="sofr",
        section_name="inflation_rates",
        primary_fetcher=_fetch,
        old_snap=old_snap,
        unit="%"
    )
    
    # Effective Fed Funds Rate
    def _fetch():
        return fetch_fred_series("EFFR")
    result["effective_fed_funds_rate"] = resolve_metric_value(
        metric_key="effective_fed_funds_rate",
        section_name="inflation_rates",
        primary_fetcher=_fetch,
        old_snap=old_snap,
        unit="%"
    )
    
    return result

def fetch_all_inflation_rates(old_snap=None) -> Dict[str, Any]:
    """Fetch all inflation and rates components."""
    logger.info("Fetching Inflation & Rates metrics...")
    inflation = fetch_inflation_components(old_snap=old_snap)
    rates = fetch_rates_components(old_snap=old_snap)
    
    return {
        **inflation,
        **rates
    }
