#!/usr/bin/env python3
"""
P0 Runtime Data Validation Script.
Validates the P0 Macro Metrics according to the Data Contract defined in macro_ia_data_matrix.md.
"""
import sys
import os
import json
import traceback
from datetime import datetime, timedelta
import pandas as pd
import yfinance as yf

# Add the project root to the python path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.utils.fred import fetch_fred_timeseries
from app.utils.logger import get_logger

logger = get_logger(__name__)

def fetch_yfinance_history(ticker_sym: str, period: str = "2y") -> pd.DataFrame:
    try:
        ticker = yf.Ticker(ticker_sym)
        hist = ticker.history(period=period)
        if hist.empty:
            return None
        hist = hist.reset_index()
        hist['date'] = pd.to_datetime(hist['Date']).dt.tz_localize(None)
        hist = hist.sort_values('date')
        return hist
    except Exception as e:
        logger.error(f"yfinance error for {ticker_sym}: {e}")
        return None

def process_fred_metric(metric_id: str, source: str, series_id: str, 
                        expected_unit: str, min_history_years: int, transformation: str,
                        scale_factor: float = 1.0) -> dict:
    
    report = {
        "metric_id": metric_id,
        "source": source,
        "fetch_success": False,
        "latest_date": None,
        "latest_raw_value": None,
        "raw_unit": "Unknown",
        "transform_applied": transformation,
        "canonical_value": None,
        "canonical_unit": expected_unit,
        "previous_value": None,
        "change_1w": None,
        "change_1m": None,
        "history_points": 0,
        "minimum_history_required": min_history_years * 52 if min_history_years >= 3 else min_history_years * 250, # Rough approx
        "minimum_history_passed": False,
        "chart_series_shape_valid": False,
        "warnings": [],
        "blocking_errors": []
    }
    
    try:
        raw_data = fetch_fred_timeseries(series_id)
        if not raw_data:
            report["blocking_errors"].append(f"Failed to fetch data for {series_id}")
            return report
            
        df = pd.DataFrame(raw_data)
        df['date'] = pd.to_datetime(df['time'])
        df = df.sort_values('date')
        df = df.dropna(subset=['value'])
        
        if df.empty:
            report["blocking_errors"].append(f"Empty data for {series_id} after dropping nulls")
            return report
            
        report["fetch_success"] = True
        report["history_points"] = len(df)
        
        # Check history length
        oldest_date = df['date'].iloc[0]
        latest_date = df['date'].iloc[-1]
        history_years = (latest_date - oldest_date).days / 365.25
        
        if history_years >= min_history_years:
            report["minimum_history_passed"] = True
        else:
            report["warnings"].append(f"History only goes back {history_years:.1f} years, expected {min_history_years}")
            
        if len(df) > 5:
            report["chart_series_shape_valid"] = True
            
        # Extract values
        latest_row = df.iloc[-1]
        report["latest_date"] = latest_row['date'].strftime('%Y-%m-%d')
        report["latest_raw_value"] = float(latest_row['value'])
        
        # Apply transformation
        df['canonical_value'] = df['value'] * scale_factor
        
        report["canonical_value"] = float(df['canonical_value'].iloc[-1])
        
        if len(df) >= 2:
            report["previous_value"] = float(df['canonical_value'].iloc[-2])
            
        # Calculate 1w and 1m changes
        one_week_ago = latest_date - timedelta(days=7)
        one_month_ago = latest_date - timedelta(days=30)
        
        df_1w = df[df['date'] <= one_week_ago]
        if not df_1w.empty:
            val_1w = float(df_1w.iloc[-1]['canonical_value'])
            report["change_1w"] = report["canonical_value"] - val_1w
            
        df_1m = df[df['date'] <= one_month_ago]
        if not df_1m.empty:
            val_1m = float(df_1m.iloc[-1]['canonical_value'])
            report["change_1m"] = report["canonical_value"] - val_1m
            
    except Exception as e:
        report["blocking_errors"].append(f"Exception processing {series_id}: {str(e)}")
        report["warnings"].append(traceback.format_exc())
        
    return report


def validate_p0_metrics():
    reports = []
    
    # 1. WALCL (Fed Balance Sheet)
    rep_walcl = process_fred_metric(
        "liq_walcl", "FRED (WALCL)", "WALCL", "Billions (USD)", 3, 
        "Value (Millions) / 1000", scale_factor=0.001
    )
    reports.append(rep_walcl)
    
    # 2. TGA Balance
    rep_tga = process_fred_metric(
        "liq_tga", "FRED (WDTGAL)", "WDTGAL", "Billions (USD)", 3, 
        "Value (Millions) / 1000", scale_factor=0.001
    )
    reports.append(rep_tga)
    
    # 3. RRP Balance
    rep_rrp = process_fred_metric(
        "liq_rrp", "FRED (RRPONTSYD)", "RRPONTSYD", "Billions (USD)", 3, 
        "None", scale_factor=1.0
    )
    reports.append(rep_rrp)
    
    # 4. Bank Reserves
    rep_reserves = process_fred_metric(
        "liq_reserves", "FRED (WRESBAL)", "WRESBAL", "Billions (USD)", 3, 
        "Value (Millions) / 1000", scale_factor=0.001
    )
    reports.append(rep_reserves)
    
    # 5. NFCI
    rep_nfci = process_fred_metric(
        "liq_nfci", "FRED (NFCI)", "NFCI", "Index Value", 3, 
        "None", scale_factor=1.0
    )
    reports.append(rep_nfci)
    
    # 6. US10Y Treasury
    rep_10y = process_fred_metric(
        "inf_us10y", "FRED (DGS10)", "DGS10", "Percent (%)", 1, 
        "None", scale_factor=1.0
    )
    reports.append(rep_10y)
    
    # 7. US Net Liquidity (Derived)
    rep_net_liq = {
        "metric_id": "liq_net_us",
        "source": "Calculated (WALCL - WDTGAL - RRPONTSYD)",
        "fetch_success": False,
        "latest_date": None,
        "latest_raw_value": None,
        "raw_unit": "Mixed",
        "transform_applied": "WALCL/1000 - WDTGAL - RRPONTSYD",
        "canonical_value": None,
        "canonical_unit": "Billions (USD)",
        "previous_value": None,
        "change_1w": None,
        "change_1m": None,
        "history_points": 0,
        "minimum_history_required": 3 * 52,
        "minimum_history_passed": False,
        "chart_series_shape_valid": False,
        "warnings": [],
        "blocking_errors": []
    }
    
    try:
        raw_walcl = fetch_fred_timeseries("WALCL")
        raw_tga = fetch_fred_timeseries("WDTGAL")
        raw_rrp = fetch_fred_timeseries("RRPONTSYD")
        
        if not raw_walcl or not raw_tga or not raw_rrp:
            rep_net_liq["blocking_errors"].append("Failed to fetch one or more component series")
        else:
            df_walcl = pd.DataFrame(raw_walcl).rename(columns={'value': 'walcl'})
            df_walcl['walcl'] = df_walcl['walcl'] / 1000.0  # Millions to Billions
            df_walcl['time'] = pd.to_datetime(df_walcl['time'])
            
            df_tga = pd.DataFrame(raw_tga).rename(columns={'value': 'tga'})
            df_tga['tga'] = df_tga['tga'] / 1000.0  # Millions to Billions
            df_tga['time'] = pd.to_datetime(df_tga['time'])
            
            df_rrp = pd.DataFrame(raw_rrp).rename(columns={'value': 'rrp'})
            df_rrp['time'] = pd.to_datetime(df_rrp['time'])
            
            # Since frequencies differ (WALCL/TGA are weekly Wed, RRP is daily), we use ffill
            df_all = pd.merge(df_rrp, df_tga, on='time', how='outer')
            df_all = pd.merge(df_all, df_walcl, on='time', how='outer')
            df_all = df_all.sort_values('time').ffill().dropna()
            
            df_all['net_liq'] = df_all['walcl'] - df_all['tga'] - df_all['rrp']
            
            if not df_all.empty:
                rep_net_liq["fetch_success"] = True
                rep_net_liq["history_points"] = len(df_all)
                rep_net_liq["chart_series_shape_valid"] = len(df_all) > 5
                
                oldest = df_all['time'].iloc[0]
                latest = df_all['time'].iloc[-1]
                history_years = (latest - oldest).days / 365.25
                if history_years >= 3:
                    rep_net_liq["minimum_history_passed"] = True
                else:
                    rep_net_liq["warnings"].append(f"History only {history_years:.1f} years")
                
                rep_net_liq["latest_date"] = latest.strftime('%Y-%m-%d')
                rep_net_liq["latest_raw_value"] = float(df_all['net_liq'].iloc[-1])
                rep_net_liq["canonical_value"] = float(df_all['net_liq'].iloc[-1])
                
                if len(df_all) >= 2:
                    rep_net_liq["previous_value"] = float(df_all['net_liq'].iloc[-2])
                    
                one_wk = latest - timedelta(days=7)
                one_mo = latest - timedelta(days=30)
                
                df_1w = df_all[df_all['time'] <= one_wk]
                if not df_1w.empty:
                    rep_net_liq["change_1w"] = rep_net_liq["canonical_value"] - float(df_1w.iloc[-1]['net_liq'])
                    
                df_1m = df_all[df_all['time'] <= one_mo]
                if not df_1m.empty:
                    rep_net_liq["change_1m"] = rep_net_liq["canonical_value"] - float(df_1m.iloc[-1]['net_liq'])
            else:
                rep_net_liq["blocking_errors"].append("Merged dataframe is empty after dropping nulls")
    except Exception as e:
        rep_net_liq["blocking_errors"].append(str(e))
        
    reports.append(rep_net_liq)
    
    # 8. VIX (yfinance)
    rep_vix = {
        "metric_id": "sen_vix",
        "source": "yfinance (^VIX)",
        "fetch_success": False,
        "latest_date": None,
        "latest_raw_value": None,
        "raw_unit": "Index",
        "transform_applied": "None",
        "canonical_value": None,
        "canonical_unit": "Index",
        "previous_value": None,
        "change_1w": None,
        "change_1m": None,
        "history_points": 0,
        "minimum_history_required": 250,
        "minimum_history_passed": False,
        "chart_series_shape_valid": False,
        "warnings": [],
        "blocking_errors": []
    }
    
    df_vix = fetch_yfinance_history("^VIX", "2y")
    if df_vix is not None and not df_vix.empty:
        rep_vix["fetch_success"] = True
        rep_vix["history_points"] = len(df_vix)
        rep_vix["chart_series_shape_valid"] = True
        
        latest_date = df_vix['date'].iloc[-1]
        rep_vix["latest_date"] = latest_date.strftime('%Y-%m-%d')
        rep_vix["latest_raw_value"] = float(df_vix['Close'].iloc[-1])
        rep_vix["canonical_value"] = float(df_vix['Close'].iloc[-1])
        
        oldest_date = df_vix['date'].iloc[0]
        history_years = (latest_date - oldest_date).days / 365.25
        if history_years >= 1:
            rep_vix["minimum_history_passed"] = True
            
        if len(df_vix) >= 2:
            rep_vix["previous_value"] = float(df_vix['Close'].iloc[-2])
            
        one_wk = latest_date - timedelta(days=7)
        one_mo = latest_date - timedelta(days=30)
        
        df_1w = df_vix[df_vix['date'] <= one_wk]
        if not df_1w.empty:
            rep_vix["change_1w"] = rep_vix["canonical_value"] - float(df_1w.iloc[-1]['Close'])
            
        df_1m = df_vix[df_vix['date'] <= one_mo]
        if not df_1m.empty:
            rep_vix["change_1m"] = rep_vix["canonical_value"] - float(df_1m.iloc[-1]['Close'])
    else:
        rep_vix["blocking_errors"].append("Failed to fetch VIX from yfinance")
        
    reports.append(rep_vix)
    
    # 9. DXY (yfinance)
    rep_dxy = {
        "metric_id": "inf_dxy",
        "source": "yfinance (DX-Y.NYB)",
        "fetch_success": False,
        "latest_date": None,
        "latest_raw_value": None,
        "raw_unit": "Index",
        "transform_applied": "None",
        "canonical_value": None,
        "canonical_unit": "Index",
        "previous_value": None,
        "change_1w": None,
        "change_1m": None,
        "history_points": 0,
        "minimum_history_required": 250,
        "minimum_history_passed": False,
        "chart_series_shape_valid": False,
        "warnings": [],
        "blocking_errors": []
    }
    
    df_dxy = fetch_yfinance_history("DX-Y.NYB", "2y")
    if df_dxy is not None and not df_dxy.empty:
        rep_dxy["fetch_success"] = True
        rep_dxy["history_points"] = len(df_dxy)
        rep_dxy["chart_series_shape_valid"] = True
        
        latest_date = df_dxy['date'].iloc[-1]
        rep_dxy["latest_date"] = latest_date.strftime('%Y-%m-%d')
        rep_dxy["latest_raw_value"] = float(df_dxy['Close'].iloc[-1])
        rep_dxy["canonical_value"] = float(df_dxy['Close'].iloc[-1])
        
        oldest_date = df_dxy['date'].iloc[0]
        history_years = (latest_date - oldest_date).days / 365.25
        if history_years >= 1:
            rep_dxy["minimum_history_passed"] = True
            
        if len(df_dxy) >= 2:
            rep_dxy["previous_value"] = float(df_dxy['Close'].iloc[-2])
            
        one_wk = latest_date - timedelta(days=7)
        one_mo = latest_date - timedelta(days=30)
        
        df_1w = df_dxy[df_dxy['date'] <= one_wk]
        if not df_1w.empty:
            rep_dxy["change_1w"] = rep_dxy["canonical_value"] - float(df_1w.iloc[-1]['Close'])
            
        df_1m = df_dxy[df_dxy['date'] <= one_mo]
        if not df_1m.empty:
            rep_dxy["change_1m"] = rep_dxy["canonical_value"] - float(df_1m.iloc[-1]['Close'])
    else:
        rep_dxy["blocking_errors"].append("Failed to fetch DXY from yfinance")
        
    reports.append(rep_dxy)

    # Output JSON Report
    with open('p0_validation_report.json', 'w') as f:
        json.dump(reports, f, indent=2)
        
    print(json.dumps(reports, indent=2))

if __name__ == "__main__":
    validate_p0_metrics()
