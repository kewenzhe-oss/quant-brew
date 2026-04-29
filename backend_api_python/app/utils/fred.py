import pandas as pd
import requests
import io
import os
from typing import Dict, Any
from app.utils.logger import get_logger

logger = get_logger(__name__)

def fetch_fred_series(series_id: str, mode: str = None) -> Dict[str, Any]:
    """
    Fetch the latest valid numeric value for a FRED series using the public CSV endpoint.
    If mode='yoy', it calculates Year-over-Year percentage change (assuming monthly frequency).
    If mode='diff', it calculates the absolute difference from the previous period.
    Returns a standardized dictionary.
    """
    result = {
        "value": None,
        "asOf": None,
        "source": "FRED",
        "seriesId": series_id,
        "status": "error",
        "error": "Unknown error"
    }
    try:
        url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
            
        logger.debug(f"Fetching FRED series: {series_id} (Mode: {mode})")
        
        proxies = {}
        if os.getenv("HTTP_PROXY"):
            proxies["http"] = os.getenv("HTTP_PROXY")
            proxies["https"] = os.getenv("HTTPS_PROXY")
        elif os.getenv("PROXY_URL"):
            proxies["http"] = os.getenv("PROXY_URL")
            proxies["https"] = os.getenv("PROXY_URL")
            
        resp = requests.get(url, proxies=proxies, timeout=30)
        resp.raise_for_status()
        
        df = pd.read_csv(io.StringIO(resp.text))
        
        # The column name is the series_id itself (or series_id + "_PC1" in some cases, so let's safely locate the data column)
        # Typically FRED CSV returns: 'observation_date', 'SERIES_ID'
        value_col = None
        for col in df.columns:
            if col != 'observation_date':
                value_col = col
                break
                
        if len(df) > 0 and value_col:
            df = df.dropna(subset=[value_col])
            df[value_col] = pd.to_numeric(df[value_col], errors='coerce')
            df = df.dropna(subset=[value_col])
            
            if mode == "yoy":
                df['calculated_val'] = df[value_col].pct_change(periods=12) * 100
            elif mode == "diff":
                df['calculated_val'] = df[value_col].diff()
            else:
                df['calculated_val'] = df[value_col]
                
            df = df.dropna(subset=['calculated_val'])
            
            if len(df) > 0:
                latest_value = float(df['calculated_val'].iloc[-1])
                date_str = str(df["observation_date"].iloc[-1])
                result["value"] = latest_value
                result["asOf"] = date_str
                result["status"] = "ok"
                result["error"] = None
            else:
                result["error"] = "No valid numeric data found in CSV"
        else:
            result["error"] = "Data column not found in CSV"
            
    except Exception as e:
        logger.warning(f"Failed to fetch FRED series {series_id}: {e}")
        result["error"] = str(e)
    
    return result

def fetch_fred_timeseries(series_id: str, mode: str = None) -> list:
    """
    Fetch historical data for a FRED series.
    Returns a list of dicts: [{"time": "YYYY-MM-DD", "value": float}, ...]
    """
    try:
        url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
        
        proxies = {}
        if os.getenv("HTTP_PROXY"):
            proxies["http"] = os.getenv("HTTP_PROXY")
            proxies["https"] = os.getenv("HTTPS_PROXY")
        elif os.getenv("PROXY_URL"):
            proxies["http"] = os.getenv("PROXY_URL")
            proxies["https"] = os.getenv("PROXY_URL")
            
        resp = requests.get(url, proxies=proxies, timeout=30)
        resp.raise_for_status()
        
        df = pd.read_csv(io.StringIO(resp.text))
        
        value_col = None
        for col in df.columns:
            if col != 'observation_date':
                value_col = col
                break
                
        if len(df) > 0 and value_col:
            df = df.dropna(subset=[value_col])
            df[value_col] = pd.to_numeric(df[value_col], errors='coerce')
            df = df.dropna(subset=[value_col])
            
            if mode == "yoy":
                df['calculated_val'] = df[value_col].pct_change(periods=12) * 100
            elif mode == "diff":
                df['calculated_val'] = df[value_col].diff()
            else:
                df['calculated_val'] = df[value_col]
                
            df = df.dropna(subset=['calculated_val'])
            
            result = []
            for _, row in df.iterrows():
                result.append({
                    "time": str(row["observation_date"]),
                    "value": float(row["calculated_val"])
                })
            return result
            
    except Exception as e:
        logger.warning(f"Failed to fetch FRED timeseries {series_id}: {e}")
        
    return []
