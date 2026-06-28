import os
os.environ["PROXY_URL"] = ""

from app.services.macro_snapshot import generate_macro_snapshot
snap = generate_macro_snapshot()

print("\n--- INFLATION RATES / US10Y YIELD ---")
print(snap.get("inflation_rates", {}).get("us10y_yield"))

print("\n--- ECONOMY / COMMERCIAL PAPER SPREAD (EXPECTED FAIL/ERR) ---")
print(snap.get("economy", {}).get("commercial_paper_spread"))

print("\n--- LIQUIDITY / FED BALANCE SHEET ---")
print(snap.get("liquidity", {}).get("fed_balance_sheet"))
