from flask import Blueprint, request, jsonify, g
from app.utils.auth import login_required
from app.utils.logger import get_logger
from app.services.plan_builder import PlanBuilderService
from app.services.plan_repository import save_plan, get_plans

logger = get_logger(__name__)

plans_bp = Blueprint('plans', __name__)

# ---------------------------------------------------------------------------
# POST /api/plans/generate  — AI draft generation (existing)
# ---------------------------------------------------------------------------
@plans_bp.route('/generate', methods=['POST'])
@login_required
def generate_plan():
    """Generate AI plan draft (does NOT persist)."""
    try:
        data = request.get_json() or {}

        user_id = getattr(g, 'user_id', None)
        if not user_id:
            return jsonify({'code': 0, 'msg': 'Unauthorized', 'data': None}), 401

        required_fields = ['symbol', 'asset_type', 'plan_type', 'total_budget',
                           'duration', 'frequency', 'risk_profile']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'code': 0, 'msg': f'Missing required field: {field}', 'data': None}), 400

        service = PlanBuilderService()
        result = service.generate_plan_draft(user_id=str(user_id), plan_data=data)

        if not result.get('success'):
            return jsonify({'code': 0, 'msg': result.get('error', 'Generation failed'), 'data': None}), 500

        return jsonify({'code': 1, 'msg': 'success', 'data': result.get('data')})

    except Exception as e:
        logger.error(f"Plan generation failed: {e}", exc_info=True)
        return jsonify({'code': 0, 'msg': str(e), 'data': None}), 500


# ---------------------------------------------------------------------------
# POST /api/plans  — Save confirmed plan
# ---------------------------------------------------------------------------
@plans_bp.route('', methods=['POST'])
@login_required
def create_plan():
    """
    Save a user-confirmed AI plan draft.
    Required body: { symbol, plan, ... }
    """
    try:
        data = request.get_json() or {}

        user_id = getattr(g, 'user_id', None)
        if not user_id:
            return jsonify({'code': 0, 'msg': 'Unauthorized', 'data': None}), 401

        # Validation
        if not data.get('symbol'):
            return jsonify({'code': 0, 'msg': 'Missing required field: symbol', 'data': None}), 400
        if not data.get('plan'):
            return jsonify({'code': 0, 'msg': 'Missing required field: plan', 'data': None}), 400
        budget = data.get('total_budget')
        if budget is not None and (not isinstance(budget, (int, float)) or budget <= 0):
            return jsonify({'code': 0, 'msg': 'total_budget must be a positive number', 'data': None}), 400

        result = save_plan(user_id=int(user_id), payload=data)

        if not result.get('success'):
            return jsonify({'code': 0, 'msg': result.get('error', 'Save failed'), 'data': None}), 500

        return jsonify({'code': 1, 'msg': 'success', 'data': {'id': result['id']}})

    except Exception as e:
        logger.error(f"create_plan failed: {e}", exc_info=True)
        return jsonify({'code': 0, 'msg': str(e), 'data': None}), 500


# ---------------------------------------------------------------------------
# GET /api/plans  — List plans for current user
# ---------------------------------------------------------------------------
@plans_bp.route('', methods=['GET'])
@login_required
def list_plans():
    """Return current user's plans, newest first."""
    try:
        user_id = getattr(g, 'user_id', None)
        if not user_id:
            return jsonify({'code': 0, 'msg': 'Unauthorized', 'data': None}), 401

        result = get_plans(user_id=int(user_id))

        if not result.get('success'):
            return jsonify({'code': 0, 'msg': result.get('error', 'Fetch failed'), 'data': None}), 500

        return jsonify({'code': 1, 'msg': 'success', 'data': result.get('data', [])})

    except Exception as e:
        logger.error(f"list_plans failed: {e}", exc_info=True)
        return jsonify({'code': 0, 'msg': str(e), 'data': None}), 500
