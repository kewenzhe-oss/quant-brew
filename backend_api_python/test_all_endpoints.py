import requests
import json

BASE_URL = "http://127.0.0.1:5050/api/equity"
SYMBOLS = ["AAPL", "NVDA", "TSLA"]

def test_endpoint(path):
    print(f"\n--- Testing {path} ---")
    for symbol in SYMBOLS:
        url = f"{BASE_URL}/{path}?symbol={symbol}"
        if path in ['history', 'technicals']:
            url += "&period=6mo&interval=1d"
        try:
            r = requests.get(url)
            print(f"\n[{r.status_code}] {url}")
            data = r.json()
            if "error" in data:
                print(f"Error: {data['error']}")
                continue
                
            if path == 'info':
                print(f"Symbol: {data.get('symbol')} | Name: {data.get('company_name')}")
                print(f"Keys: {list(data.keys())[:10]}...")
            elif path == 'quote':
                print(f"Symbol: {data.get('symbol')} | Price: {data.get('price')} | Change: {data.get('change_percent')}%")
            elif path == 'history':
                timestamps = data.get("timestamps", [])
                print(f"Candles length: {len(timestamps)}")
                if len(timestamps) > 0:
                    print(f"Keys in quotes: {list(data.get('quotes', {}).keys())}")
            elif path == 'financials':
                print(f"Statement keys: {list(data.keys())}")
                if 'income_statement' in data:
                    print(f"Income Dates: {list(data['income_statement'].keys())}")
            elif path == 'technicals':
                print(f"Trend: {len(data.get('trend', []))} | Momentum: {len(data.get('momentum', []))}")
                print(f"Volatility: {len(data.get('volatility', []))} | Volume: {len(data.get('volume', []))}")
                
            # Check for NaN / Infinity (JSON encoder should have failed if these existed, but we can verify text)
            json_str = json.dumps(data)
            if "NaN" in json_str or "Infinity" in json_str:
                print("WARNING: Found NaN/Infinity in JSON!")
        except Exception as e:
            print(f"Exception: {str(e)}")

for p in ['info', 'quote', 'history', 'financials', 'technicals']:
    test_endpoint(p)
