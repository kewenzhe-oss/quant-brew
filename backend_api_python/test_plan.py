import sys
import os
import json
from dotenv import load_dotenv

# Load env before imports
load_dotenv(".env")

sys.path.append(os.getcwd())

from app.services.plan_builder import PlanBuilderService

service = PlanBuilderService()

tests = [
    {
        "symbol": "AAPL",
        "asset_type": "Stock",
        "plan_type": "Long-term DCA",
        "total_budget": 100000,
        "duration": "12 months",
        "frequency": "Monthly",
        "risk_profile": "Balanced",
        "thesis": "Long-term allocation to a mature technology company with strong ecosystem and cash flow."
    },
    {
        "symbol": "QQQ",
        "asset_type": "ETF",
        "plan_type": "Long-term DCA",
        "total_budget": 50000,
        "duration": "12 months",
        "frequency": "Monthly",
        "risk_profile": "Conservative",
        "thesis": "Tech sector exposure."
    },
    {
        "symbol": "BTC",
        "asset_type": "Crypto",
        "plan_type": "Long-term DCA",
        "total_budget": 10000,
        "duration": "12 months",
        "frequency": "Weekly",
        "risk_profile": "Aggressive",
        "thesis": "Digital gold."
    }
]

for t in tests:
    print(f"Testing {t['symbol']}...")
    result = service.generate_plan_draft("test_user", t)
    if result["success"]:
        print("Success!")
        data = result["data"]
        print(f"Summary: {data.get('plan_summary')}")
        print(f"Budget Allocation: {json.dumps(data.get('budget_allocation'), ensure_ascii=False)}")
        print(f"Action Rules: {json.dumps(data.get('action_rules'), ensure_ascii=False)}")
        print(f"Checklist: {data.get('asset_specific_checklist')}")
    else:
        print("Failed:", result["error"])
    print("-" * 50)
