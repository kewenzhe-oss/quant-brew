import sys
import json
from app.services.macro_snapshot import read_macro_snapshot

snap = read_macro_snapshot()
if snap is None:
    print("NO SNAPSHOT FOUND")
else:
    print("SNAPSHOT STATUS:", snap.get("status"))
    print("MISSING:", snap.get("missing_sections"))
    print("--- LIQUIDITY ---")
    print(json.dumps(snap.get("liquidity_us"), indent=2))
    print("--- SENTIMENT ---")
    print(json.dumps(snap.get("sentiment"), indent=2))
