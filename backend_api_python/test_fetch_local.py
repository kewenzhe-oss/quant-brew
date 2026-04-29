import sys
import os
import json
from datetime import datetime

# Add the backend to the sys path
sys.path.append("/Users/grangerfdad/Desktop/QuantDinger-clone/backend_api_python")

from app.data_sources.factory import DataSourceFactory

def test_fetch():
    market = 'Crypto'
    symbol = 'ETH/USDT'
    timeframe = '1H'
    
    start_date = datetime(2025, 10, 29)
    end_date = datetime(2026, 4, 29, 23, 59, 59)
    
    # Simulate what _fetch_kline_data does
    import math
    from datetime import timedelta
    import calendar
    
    total_seconds = (end_date - start_date).total_seconds()
    tf_seconds = 3600
    limit = math.ceil(total_seconds / tf_seconds) + 200
    
    before_time = calendar.timegm((end_date + timedelta(days=1)).timetuple())
    
    print(f"Fetching from CCXT: symbol={symbol}, limit={limit}, before_time={before_time}")
    
    # Try fetching data directly from CryptoDataSource
    source = DataSourceFactory.get_source(market)
    ccxt_timeframe = source.TIMEFRAME_MAP.get(timeframe, '1h')
    symbol_pair = source._normalize_symbol_for_exchange(symbol)
    
    print(f"Normalized symbol: {symbol_pair}")
    
    ohlcv = source._fetch_ohlcv(symbol_pair, ccxt_timeframe, limit, before_time, timeframe)
    
    print(f"Returned rows: {len(ohlcv)}")
    if ohlcv:
        print(f"First row: {ohlcv[0]}")
        print(f"Last row: {ohlcv[-1]}")

if __name__ == '__main__':
    test_fetch()
