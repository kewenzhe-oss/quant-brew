import sys
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

# Setup django/flask-like environment context if needed, or import directly
from app.utils.db import get_db_connection
from app.services.backtest import BacktestService

def inspect_database_and_run_backtests():
    # 1. Query indicators
    with get_db_connection() as db:
        cur = db.cursor()
        cur.execute("SELECT id, name, code FROM qd_indicator_codes WHERE id = 4") # Bollinger Bands Touch
        row = cur.fetchone()
        cur.close()
        
    if not row:
        print("Indicator with ID 4 not found.")
        return
        
    code = row.get('code')
    service = BacktestService()
    
    # 15 days range (from 15 days ago to now)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=15)
    
    market = 'Crypto'
    symbol = 'BTC/USDT'
    timeframe = '1H'
    
    print(f"--- Running 15-day run_multi_timeframe for {symbol} ---")
    print(f"Range: {start_date} to {end_date}")
    
    try:
        result = service.run_multi_timeframe(
            indicator_code=code,
            market=market,
            symbol=symbol,
            timeframe=timeframe,
            start_date=start_date,
            end_date=end_date,
            initial_capital=10000.0,
            commission=0.001,
            slippage=0.0,
            leverage=1,
            trade_direction='long',
            strategy_config=None,
            enable_mtf=True
        )
        print("\n--- MTF Backtest Result Summary ---")
        print(f"Total Trades: {result.get('totalTrades')}")
        print(f"Total Return: {result.get('totalReturn')}%")
        print(f"Trades count: {len(result.get('trades', []))}")
        print(f"Precision Info used: {result.get('precision_info')}")
        if result.get('trades'):
            print("First few trades:")
            for t in result.get('trades')[:5]:
                print(f"  Time: {t.get('time')} | BarTime: {t.get('bar_time')} | Type: {t.get('type')} | Price: {t.get('price')}")
    except Exception as e:
        print(f"MTF run failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    inspect_database_and_run_backtests()
