import os
import sys

# Add backend dir to sys path so imports work
backend_path = os.path.join(os.path.dirname(__file__), 'backend_api_python')
sys.path.insert(0, backend_path)

from app.services.macro_snapshot import generate_macro_snapshot
from app.services.macro_ai_briefing import generate_daily_briefing
from app.utils.logger import get_logger

logger = get_logger(__name__)

if __name__ == "__main__":
    try:
        print("Generating macro snapshot...")
        # Force generate the snapshot so we have data
        snapshot = generate_macro_snapshot()
        print(f"Snapshot generated with status: {snapshot.get('status')}")
        
        print("\nTriggering daily briefing...")
        briefing = generate_daily_briefing()
        print("Success! Generated Briefing:")
        import json
        print(json.dumps(briefing, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Error: {e}")
