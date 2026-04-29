import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.data_providers.yfinance_provider import get_info, get_quote, get_historical

print("Testing get_info('AAPL')...")
info = get_info('AAPL')
if 'error' in info:
    print(f"Error: {info['error']}")
else:
    print(f"Company: {info.get('company_name')}, Market Cap: {info.get('market_cap')}")

print("\nTesting get_quote('AAPL')...")
quote = get_quote('AAPL')
if 'error' in quote:
    print(f"Error: {quote['error']}")
else:
    print(f"Price: {quote.get('price')}, Change: {quote.get('change')} ({quote.get('change_percent')}%)")

print("\nTesting get_historical('AAPL')...")
hist = get_historical('AAPL', '1mo', '1d')
print(f"Length: {len(hist)}")
if len(hist) > 0:
    print(f"First: {hist[0]}")
    print(f"Last: {hist[-1]}")
