import requests
import pandas as pd
import io

def fetch(series_id, units=None):
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
    if units:
        url += f"&units={units}"
    resp = requests.get(url)
    df = pd.read_csv(io.StringIO(resp.text))
    col = df.columns[1]
    df = df.dropna(subset=[col])
    print(f"{series_id} ({units}): {df[col].iloc[-1]}")

fetch("PAYEMS", "chg")
fetch("ICSA")
fetch("JTSJOL")
