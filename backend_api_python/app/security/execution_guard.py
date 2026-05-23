import os
from flask import jsonify

def execution_routes_enabled() -> bool:
    """Check if execution routes are explicitly enabled in the environment."""
    return os.getenv("ENABLE_EXECUTION_ROUTES", "false").lower() == "true"

def execution_disabled_response():
    """Return a standard 403 response indicating execution is disabled."""
    return jsonify({
        "code": 0,
        "msg": "Execution routes are disabled in QuantBrew mode.",
        "success": False,
        "error": "Execution routes are disabled in QuantBrew mode.",
        "data": {
            "enabled": False,
            "reason": "QuantBrew is configured as an observation, planning and review tool, not a trading execution terminal."
        }
    }), 403

def require_execution_enabled():
    """Check guard status; returns 403 Response if disabled, else None."""
    if not execution_routes_enabled():
        return execution_disabled_response()
    return None
