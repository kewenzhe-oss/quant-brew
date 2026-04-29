import pandas as pd
import requests
import io

def fetch(series_id, mode=None):
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
    resp = requests.get(url)
    df = pd.read_csv(io.StringIO(resp.text))
    col = df.columns[1]
    df = df.dropna(subset=[col])
    df[col] = pd.to_numeric(df[col], errors='coerce')
    df = df.dropna(subset=[col])
    
    if mode == "yoy":
        df['val'] = df[col].pct_change(periods=12) * 100
    elif mode == "diff":
        df['val'] = df[col].diff()
    else:
        df['val'] = df[col]
        
    df = df.dropna(subset=['val'])
    print(f"{series_id} ({mode}): {df['val'].iloc[-1]:.2f}")

fetch("CPIAUCSL", "yoy")
fetch("RSXFS", "yoy")
fetch("PAYEMS", "diff")
fetch("A191RL1Q225SBEA")
