import sys
import os
sys.path.append(os.getcwd())
from app.data_providers.economy import fetch_all_economy
from app.data_providers.inflation import fetch_all_inflation_rates
from app.data_providers.liquidity import fetch_all_liquidity

eco = fetch_all_economy()
inf = fetch_all_inflation_rates()
liq = fetch_all_liquidity()

print("== Economy ==")
for k, v in eco.items():
    print(f"{k}: {v.get('value')} {v.get('unit', '')}")

print("\n== Inflation ==")
for k, v in inf.items():
    print(f"{k}: {v.get('value')} {v.get('unit', '')}")

print("\n== Liquidity ==")
for k, v in liq.items():
    print(f"{k}: {v.get('value')} {v.get('unit', '')}")
