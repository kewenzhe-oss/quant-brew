import yfinance as yf
from datetime import datetime
import pandas as pd
from typing import Dict, Any, List
import numpy as np

def get_quote(symbol: str) -> Dict[str, Any]:
    """Fetch real-time quote for a single symbol."""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        hist = ticker.history(period="1d")
        
        if hist.empty:
            return {"error": "No data available", "symbol": symbol}
        
        current_price = hist['Close'].iloc[-1]
        previous_close = info.get('previousClose', current_price)
        change = current_price - previous_close
        change_percent = (change / previous_close) * 100 if previous_close else 0
        
        return {
            "symbol": symbol,
            "price": round(float(current_price), 2),
            "change": round(float(change), 2),
            "change_percent": round(float(change_percent), 2),
            "volume": int(hist['Volume'].iloc[-1]) if not pd.isna(hist['Volume'].iloc[-1]) else None,
            "high": round(float(hist['High'].iloc[-1]), 2) if not pd.isna(hist['High'].iloc[-1]) else None,
            "low": round(float(hist['Low'].iloc[-1]), 2) if not pd.isna(hist['Low'].iloc[-1]) else None,
            "open": round(float(hist['Open'].iloc[-1]), 2) if not pd.isna(hist['Open'].iloc[-1]) else None,
            "previous_close": round(float(previous_close), 2),
            "timestamp": int(datetime.now().timestamp()),
            "exchange": info.get('exchange', '')
        }
    except Exception as e:
        return {"error": str(e), "symbol": symbol}

def get_info(symbol: str) -> Dict[str, Any]:
    """Fetch company metadata, valuation metrics, and profiles."""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # We explicitly map keys here to prevent returning unneeded junk
        return {
            "symbol": symbol,
            "company_name": info.get('longName', info.get('shortName', 'N/A')),
            "sector": info.get('sector', 'N/A'),
            "industry": info.get('industry', 'N/A'),
            "description": info.get('longBusinessSummary', 'N/A'),
            "website": info.get('website', 'N/A'),
            "country": info.get('country', 'N/A'),
            "currency": info.get('currency', 'USD'),
            "exchange": info.get('exchange', 'N/A'),
            "employees": info.get('fullTimeEmployees'),
            "market_cap": info.get('marketCap'),
            "pe_ratio": info.get('trailingPE'),
            "forward_pe": info.get('forwardPE'),
            "peg_ratio": info.get('trailingPegRatio'),
            "price_to_book": info.get('priceToBook'),
            "dividend_yield": info.get('dividendYield'),
            "shares_outstanding": info.get('sharesOutstanding'),
            "float_shares": info.get('floatShares'),
            "held_insiders_pct": info.get('heldPercentInsiders'),
            "held_institutions_pct": info.get('heldPercentInstitutions'),
            "short_pct_of_float": info.get('shortPercentOfFloat'),
            "target_high_price": info.get('targetHighPrice'),
            "target_low_price": info.get('targetLowPrice'),
            "target_mean_price": info.get('targetMeanPrice'),
            "number_of_analyst_opinions": info.get('numberOfAnalystOpinions'),
            "recommendation_key": info.get('recommendationKey'),
            "return_on_assets": info.get('returnOnAssets'),
            "return_on_equity": info.get('returnOnEquity'),
            "gross_margins": info.get('grossMargins'),
            "operating_margins": info.get('operatingMargins'),
            "profit_margins": info.get('profitMargins'),
            "revenue_growth": info.get('revenueGrowth'),
            "earnings_growth": info.get('earningsGrowth'),
            "total_cash": info.get('totalCash'),
            "total_debt": info.get('totalDebt'),
            "current_ratio": info.get('currentRatio'),
            "free_cashflow": info.get('freeCashflow'),
            "fifty_two_week_high": info.get('fiftyTwoWeekHigh'),
            "fifty_two_week_low": info.get('fiftyTwoWeekLow'),
            "average_volume": info.get('averageVolume'),
            "beta": info.get('beta'),
        }
    except Exception as e:
        return {"error": str(e), "symbol": symbol}

def get_historical(symbol: str, period: str = '6mo', interval: str = '1d') -> List[Dict[str, Any]]:
    """Fetch OHLCV K-line data."""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period, interval=interval)
        
        if hist.empty:
            return []
            
        historical_data = []
        for index, row in hist.iterrows():
            historical_data.append({
                "timestamp": int(index.timestamp()),
                "open": round(float(row['Open']), 2),
                "high": round(float(row['High']), 2),
                "low": round(float(row['Low']), 2),
                "close": round(float(row['Close']), 2),
                "volume": int(row['Volume']) if not pd.isna(row['Volume']) else 0
            })
        return historical_data
    except Exception as e:
        # In case of error, returning empty list allows frontend to handle gracefully
        return []

def get_financials(symbol: str, period: str = 'annual') -> Dict[str, Any]:
    """Fetch the latest annual or quarterly income statement, balance sheet, and cash flow."""
    try:
        ticker = yf.Ticker(symbol)
        
        if period == 'quarterly':
            income_stmt = ticker.quarterly_financials
            balance_sheet = ticker.quarterly_balance_sheet
            cash_flow = ticker.quarterly_cashflow
        else:
            income_stmt = ticker.financials
            balance_sheet = ticker.balance_sheet
            cash_flow = ticker.cashflow
        
        def safe_dataframe_to_dict(df: pd.DataFrame) -> Dict[str, Dict[str, Any]]:
            if df is None or df.empty:
                return {}
            
            result = {}
            for col in df.columns:
                # Column is usually a timestamp, convert to YYYY-MM-DD string
                date_str = str(col)[:10] if hasattr(col, '__str__') else str(col)
                result[date_str] = {}
                
                for idx in df.index:
                    val = df.loc[idx, col]
                    # Handle NaN, Infinity, and missing values safely
                    if pd.isna(val) or np.isinf(val):
                        result[date_str][str(idx)] = None
                    else:
                        result[date_str][str(idx)] = float(val) if isinstance(val, (int, float, np.number)) else str(val)
            return result
            
        return {
            "symbol": symbol,
            "income_statement": safe_dataframe_to_dict(income_stmt),
            "balance_sheet": safe_dataframe_to_dict(balance_sheet),
            "cash_flow": safe_dataframe_to_dict(cash_flow)
        }
    except Exception as e:
        return {"error": str(e), "symbol": symbol}

def get_technicals(symbol: str, period: str = '1y', interval: str = '1d') -> Dict[str, Any]:
    """Fetch and compute technical indicators using pandas-ta."""
    try:
        import pandas_ta as ta
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period, interval=interval)
        
        if df.empty:
            return {"error": "No data available", "symbol": symbol}

        # Ensure index is datetime and sort
        df.index = pd.to_datetime(df.index)
        df.sort_index(inplace=True)

        # Compute indicators
        df.ta.rsi(length=14, append=True)
        df.ta.macd(fast=12, slow=26, signal=9, append=True)
        df.ta.stoch(append=True) # %K, %D
        df.ta.adx(length=14, append=True)
        df.ta.cci(length=20, append=True)
        df.ta.mfi(length=14, append=True)
        df.ta.bbands(length=20, std=2, append=True)
        df.ta.willr(length=14, append=True)
        df.ta.atr(length=14, append=True)
        df.ta.cmf(length=20, append=True)
        
        # Helper to safely extract the last value of a column.
        # Returns None (not 0.0) when column is missing or value is NaN.
        # Only a genuine computed 0 will return 0.0.
        def get_last(col_name: str, default=None):
            if col_name in df.columns:
                val = df[col_name].iloc[-1]
                return float(val) if not pd.isna(val) else default
            return default

        # Structure the data to match the FinceptTerminal model
        last_close = get_last('Close')
        
        trend = [
            {"name": "MACD", "value": get_last('MACD_12_26_9'), "category": "trend", "signal": 0},
            {"name": "ADX", "value": get_last('ADX_14'), "category": "trend", "signal": 0},
        ]
        
        momentum = [
            {"name": "RSI", "value": get_last('RSI_14'), "category": "momentum", "signal": 0},
            {"name": "Stoch %K", "value": get_last('STOCHk_14_3_3'), "category": "momentum", "signal": 0},
            {"name": "Stoch %D", "value": get_last('STOCHd_14_3_3'), "category": "momentum", "signal": 0},
            {"name": "CCI", "value": get_last('CCI_20_0.015'), "category": "momentum", "signal": 0},
            {"name": "Williams %R", "value": get_last('WILLR_14'), "category": "momentum", "signal": 0},
        ]
        
        volatility = [
            {"name": "ATR", "value": get_last('ATRr_14'), "category": "volatility", "signal": 0},
            {"name": "BB Upper", "value": get_last('BBU_20_2.0_2.0'), "category": "volatility", "signal": 0},
            {"name": "BB Mid", "value": get_last('BBM_20_2.0_2.0'), "category": "volatility", "signal": 0},
            {"name": "BB Lower", "value": get_last('BBL_20_2.0_2.0'), "category": "volatility", "signal": 0},
            {"name": "BB %B", "value": get_last('BBP_20_2.0_2.0'), "category": "volatility", "signal": 0},
            {"name": "BB Width", "value": get_last('BBB_20_2.0_2.0'), "category": "volatility", "signal": 0},
        ]
        
        volume = [
            {"name": "MFI", "value": get_last('MFI_14'), "category": "volume", "signal": 0},
            {"name": "CMF", "value": get_last('CMF_20'), "category": "volume", "signal": 0},
        ]

        return {
            "symbol": symbol,
            "timestamp": int(datetime.now().timestamp()),
            "trend": trend,
            "momentum": momentum,
            "volatility": volatility,
            "volume": volume,
            "overall_signal": 0, # Unused
            "strong_buy": 0, "buy": 0, "neutral": 0, "sell": 0, "strong_sell": 0
        }
    except Exception as e:
        return {"error": str(e), "symbol": symbol}

def get_equity_timeseries(symbol: str, metric_key: str, period: str = '1y', interval: str = '1d') -> Dict[str, Any]:
    """Fetch timeseries data for specific equity metrics (technicals or financials)."""
    try:
        ticker = yf.Ticker(symbol)
        
        # Define technical indicator mapping
        technical_mapping = {
            'rsi': ('RSI', 'RSI_14'),
            'macd': ('MACD', 'MACD_12_26_9'),
            'stoch_k': ('Stochastic %K', 'STOCHk_14_3_3'),
            'cci': ('CCI', 'CCI_20_0.015'),
            'atr': ('ATR', 'ATRr_14'),
            'mfi': ('MFI', 'MFI_14'),
            'willr': ('Williams %R', 'WILLR_14'),
            'adx': ('ADX', 'ADX_14')
        }
        
        # Define financial metrics mapping
        financial_mapping = {
            'total_revenue': ('Total Revenue', 'Total Revenue'),
            'net_income': ('Net Income', 'Net Income'),
            'gross_profit': ('Gross Profit', 'Gross Profit'),
            'operating_income': ('Operating Income', 'Operating Income')
        }

        series_data = []
        name = metric_key
        
        if metric_key in technical_mapping:
            name, col_name = technical_mapping[metric_key]
            import pandas_ta as ta
            df = ticker.history(period=period, interval=interval)
            if df.empty:
                return {"error": "No data available"}
            
            df.index = pd.to_datetime(df.index)
            df.sort_index(inplace=True)
            
            # Compute specific indicator based on metric_key to save time
            if metric_key == 'rsi': df.ta.rsi(length=14, append=True)
            elif metric_key == 'macd': df.ta.macd(fast=12, slow=26, signal=9, append=True)
            elif metric_key == 'stoch_k': df.ta.stoch(append=True)
            elif metric_key == 'cci': df.ta.cci(length=20, append=True)
            elif metric_key == 'atr': df.ta.atr(length=14, append=True)
            elif metric_key == 'mfi': df.ta.mfi(length=14, append=True)
            elif metric_key == 'willr': df.ta.willr(length=14, append=True)
            elif metric_key == 'adx': df.ta.adx(length=14, append=True)
            
            if col_name in df.columns:
                for idx, row in df.iterrows():
                    val = row[col_name]
                    if not pd.isna(val):
                        series_data.append({
                            "time": idx.strftime('%Y-%m-%d'),
                            "value": float(val)
                        })
        
        elif metric_key in financial_mapping:
            name, row_name = financial_mapping[metric_key]
            # Use annual financials
            df = ticker.financials
            if df is not None and not df.empty and row_name in df.index:
                row_data = df.loc[row_name]
                # ticker.financials columns are usually datetime
                for col in df.columns:
                    val = row_data[col]
                    date_str = str(col)[:10] if hasattr(col, '__str__') else str(col)
                    if not pd.isna(val) and not np.isinf(val):
                        series_data.append({
                            "time": date_str,
                            "value": float(val)
                        })
                # Sort by time ascending
                series_data.sort(key=lambda x: x['time'])
        else:
            return {"error": f"Unknown metric_key: {metric_key}"}

        return {
            "metricKey": metric_key,
            "name": name,
            "series": series_data,
            "dataQuality": {"status": "ok"}
        }
    except Exception as e:
        return {
            "metricKey": metric_key,
            "name": metric_key,
            "series": [],
            "dataQuality": {"status": "error", "errorMsg": str(e)}
        }
