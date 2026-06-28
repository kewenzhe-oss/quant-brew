import ccxt
exchange = ccxt.binance()
ticker = exchange.fetch_ticker('BTC/USDT')
print("Keys:", ticker.keys())
print("last:", ticker.get('last'))
print("change:", ticker.get('change'))
print("percentage:", ticker.get('percentage'))
