import yfinance as yf
print("YF News for AAPL:")
news = yf.Ticker("AAPL").news
for n in news[:2]:
    print(n['title'], n.get('link', n.get('previewUrl', '')))

import os
import finnhub
api_key = os.getenv('FINNHUB_API_KEY')
if api_key:
    finnhub_client = finnhub.Client(api_key=api_key)
    print("\nFinnhub Peers for AAPL:")
    try:
        print(finnhub_client.company_peers('AAPL'))
    except Exception as e:
        print("Finnhub error:", e)
else:
    print("\nNo FINNHUB_API_KEY in env.")
