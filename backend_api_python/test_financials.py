import sys
import os
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.data_providers.yfinance_provider import get_financials

print("Fetching AAPL financials...")
raw = get_financials("AAPL", "annual")
print(json.dumps(raw, indent=2))
