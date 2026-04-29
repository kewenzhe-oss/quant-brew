import sys
import logging
logging.basicConfig(level=logging.DEBUG)

# Mock config or environment to run snapshot
import os
os.environ["PROXY_URL"] = ""

from app.services.macro_snapshot import generate_macro_snapshot
snap = generate_macro_snapshot()
print("\n--- LIQUIDITY US ---")
print(snap.get("liquidity_us"))
print("\n--- SENTIMENT ---")
print(snap.get("sentiment"))
print("\n--- MISSING ---")
print(snap.get("missing_sections"))
