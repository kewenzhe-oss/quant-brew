"""
Quick test: verify FRED API key works and data is retrievable.
Usage:
    FRED_API_KEY=your_key_here python3 test_fred_api.py
Or set FRED_API_KEY in .env and run normally.
"""
import os
import sys

# Load .env
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

from app.utils.fred import fetch_fred_series, fetch_fred_timeseries

TEST_METRICS = [
    ("DGS10",       None,   "US 10Y Yield"),
    ("RRPONTSYD",   None,   "RRP Balance"),
    ("NFCI",        None,   "NFCI"),
    ("T10YIE",      None,   "Breakeven 10Y"),
    ("CPIAUCSL",    "yoy",  "CPI YoY"),
    ("A191RL1Q225SBEA", None, "GDP Growth"),
]

print("=" * 60)
print(f"FRED_API_KEY configured: {'YES' if os.getenv('FRED_API_KEY') else 'NO (will try CSV)'}")
print("=" * 60)

all_ok = True
for series_id, mode, label in TEST_METRICS:
    res = fetch_fred_series(series_id, mode=mode)
    status = "✅" if res.get("status") == "ok" else "❌"
    val = res.get("value")
    as_of = res.get("asOf", "?")
    err = res.get("error", "")
    print(f"{status}  {label:30s} | value={val!r:12} | as_of={as_of} | {err if err else ''}")
    if res.get("status") != "ok":
        all_ok = False

print("=" * 60)
if all_ok:
    print("ALL METRICS RESOLVED ✅ — safe to trigger /api/global-market/refresh")
else:
    print("SOME METRICS FAILED ❌")
    print()
    print("Next step: Get a free FRED API key at")
    print("  https://fred.stlouisfed.org/docs/api/api_key.html")
    print("Then add to .env:  FRED_API_KEY=your_key_here")
    print("Then restart the backend server.")
