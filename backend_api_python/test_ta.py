import yfinance as yf
import pandas as pd
import pandas_ta as ta

df = yf.Ticker("AAPL").history(period="1y")
if not df.empty:
    df.ta.rsi(append=True)
    df.ta.macd(append=True)
    print(df.columns)
    print(df.tail(1))
