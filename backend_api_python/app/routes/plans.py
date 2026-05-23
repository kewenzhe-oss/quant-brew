from flask import Blueprint, request, jsonify, g
from app.utils.auth import login_required
from app.utils.logger import get_logger
from app.services.plan_builder import PlanBuilderService
from app.services.plan_repository import save_plan, get_plans, update_plan_status, get_plan_by_id, update_plan_details

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

        data = result.get('data', [])
        status_filter = request.args.get('status')
        if status_filter:
            data = [p for p in data if p.get('status') == status_filter]

        return jsonify({'code': 1, 'msg': 'success', 'data': data})

    except Exception as e:
        logger.error(f"list_plans failed: {e}", exc_info=True)
        return jsonify({'code': 0, 'msg': str(e), 'data': None}), 500

# ---------------------------------------------------------------------------
# GET /api/plans/<plan_id>  — Get details for a specific plan
# ---------------------------------------------------------------------------
@plans_bp.route('/<plan_id>', methods=['GET'])
@login_required
def get_plan(plan_id):
    """Return details for a specific plan."""
    try:
        user_id = getattr(g, 'user_id', None)
        if not user_id:
            return jsonify({'code': 0, 'msg': 'Unauthorized', 'data': None}), 401

        result = get_plan_by_id(user_id=int(user_id), plan_id=plan_id)

        if not result.get('success'):
            return jsonify({'code': 0, 'msg': result.get('error', 'Fetch failed'), 'data': None}), 404

        return jsonify({'code': 1, 'msg': 'success', 'data': result.get('data')})

    except Exception as e:
        logger.error(f"get_plan failed: {e}", exc_info=True)
        return jsonify({'code': 0, 'msg': str(e), 'data': None}), 500

# ---------------------------------------------------------------------------
# PUT /api/plans/<plan_id>  — Update plan details
# ---------------------------------------------------------------------------
@plans_bp.route('/<plan_id>', methods=['PUT'])
@login_required
def update_plan(plan_id):
    """Update details of an existing plan."""
    try:
        user_id = getattr(g, 'user_id', None)
        if not user_id:
            return jsonify({'code': 0, 'msg': 'Unauthorized', 'data': None}), 401

        data = request.get_json() or {}
        
        # Valid fields to update
        update_payload = {}
        if 'total_budget' in data:
            try:
                update_payload['total_budget'] = float(data['total_budget'])
            except ValueError:
                return jsonify({'code': 0, 'msg': 'total_budget must be a number', 'data': None}), 400
        if 'duration' in data:
            update_payload['duration'] = str(data['duration'])
        if 'frequency' in data:
            update_payload['frequency'] = str(data['frequency'])
        if 'thesis' in data:
            update_payload['thesis'] = str(data['thesis'])
            
        if not update_payload:
            return jsonify({'code': 0, 'msg': 'No valid fields provided for update', 'data': None}), 400

        result = update_plan_details(user_id=int(user_id), plan_id=plan_id, payload=update_payload)

        if not result.get('success'):
            return jsonify({'code': 0, 'msg': result.get('error', 'Update failed'), 'data': None}), 500

        return jsonify({'code': 1, 'msg': 'success', 'data': None})

    except Exception as e:
        logger.error(f"update_plan failed: {e}", exc_info=True)
        return jsonify({'code': 0, 'msg': str(e), 'data': None}), 500

# ---------------------------------------------------------------------------
# POST /api/plans/<plan_id>/status  — Update plan status
# ---------------------------------------------------------------------------
@plans_bp.route('/<plan_id>/status', methods=['POST'])
@login_required
def change_plan_status(plan_id):
    """Change the status of a plan."""
    try:
        user_id = getattr(g, 'user_id', None)
        if not user_id:
            return jsonify({'code': 0, 'msg': 'Unauthorized', 'data': None}), 401

        data = request.get_json() or {}
        action = data.get('action')
        
        # Valid actions: activate, pause, complete, archive, delete
        action_to_status = {
            'activate': 'active',
            'pause': 'paused',
            'complete': 'completed',
            'archive': 'archived',
            'delete': 'deleted'
        }
        
        if action not in action_to_status:
            return jsonify({'code': 0, 'msg': 'Invalid action', 'data': None}), 400
            
        new_status = action_to_status[action]
        
        # Fetch current plan to check allowed transitions
        plan_res = get_plan_by_id(user_id=int(user_id), plan_id=plan_id)
        if not plan_res.get('success'):
            return jsonify({'code': 0, 'msg': 'Plan not found', 'data': None}), 404
            
        current_status = plan_res['data'].get('status')
        
        # Guard rules
        if current_status == 'deleted':
            return jsonify({'code': 0, 'msg': 'Cannot modify deleted plan', 'data': None}), 400
            
        if current_status == 'completed' and action == 'activate':
            return jsonify({'code': 0, 'msg': 'Cannot reactivate a completed plan', 'data': None}), 400
            
        result = update_plan_status(user_id=int(user_id), plan_id=plan_id, new_status=new_status)

        if not result.get('success'):
            return jsonify({'code': 0, 'msg': result.get('error', 'Update failed'), 'data': None}), 500

        return jsonify({'code': 1, 'msg': 'success', 'data': {'status': new_status}})

    except Exception as e:
        logger.error(f"change_plan_status failed: {e}", exc_info=True)
        return jsonify({'code': 0, 'msg': str(e), 'data': None}), 500
