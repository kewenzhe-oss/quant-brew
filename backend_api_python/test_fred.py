import requests
import pandas as pd
import io
import os

def test_fred():
    series_id = "WALCL"
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    proxies = {}
    if os.getenv("HTTP_PROXY"):
        proxies["http"] = os.getenv("HTTP_PROXY")
        proxies["https"] = os.getenv("HTTPS_PROXY")
    elif os.getenv("PROXY_URL"):
        proxies["http"] = os.getenv("PROXY_URL")
        proxies["https"] = os.getenv("PROXY_URL")
    
    try:
        print("Fetching with proxies:", proxies)
        resp = requests.get(url, headers=headers, proxies=proxies, timeout=10)
        resp.raise_for_status()
        df = pd.read_csv(io.StringIO(resp.text))
        df = df.dropna(subset=[series_id])
        df[series_id] = pd.to_numeric(df[series_id], errors='coerce')
        df = df.dropna(subset=[series_id])
        print("Success:", df[series_id].iloc[-1])
    except Exception as e:
        print("Failed:", e)

test_fred()
