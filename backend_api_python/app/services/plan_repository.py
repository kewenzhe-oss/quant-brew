"""
Plan Repository — CRUD for qd_plans table.
Only handles user-confirmed DCA / staged-entry plans.
No BUY/SELL signals, no PnL, no target prices.
"""
import json
import uuid
from datetime import datetime

from app.utils.logger import get_logger

logger = get_logger(__name__)

# Red-line fields that must never be stored
_RED_LINE_FIELDS = {
    "expected_return", "target_price", "win_rate", "accuracy",
    "buy_sell_signal", "guaranteed_profit", "stop_loss", "take_profit"
}


def _now_iso() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")


def _sanitize_plan_json(plan_obj: dict) -> dict:
    """Remove red-line fields from plan JSON before storage."""
    return {k: v for k, v in plan_obj.items() if k not in _RED_LINE_FIELDS}


def _get_db():
    """Return a database connection. Supports PostgreSQL (primary) and SQLite (fallback)."""
    try:
        from app.utils.db_postgres import get_connection
        return get_connection(), "postgres"
    except Exception:
        import sqlite3
        import os
        db_path = os.path.join(os.path.dirname(__file__), "../../data/quantdinger.db")
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        return conn, "sqlite"


def ensure_table_exists():
    """Idempotent: create qd_plans if it doesn't exist (migration safety net)."""
    conn, db_type = _get_db()
    try:
        cur = conn.cursor()
        if db_type == "postgres":
            cur.execute("""
                CREATE TABLE IF NOT EXISTS qd_plans (
                    id VARCHAR(64) PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    symbol VARCHAR(50) NOT NULL,
                    asset_type VARCHAR(50),
                    plan_type VARCHAR(100),
                    status VARCHAR(30) DEFAULT 'active',
                    total_budget DECIMAL(20,2),
                    duration VARCHAR(50),
                    frequency VARCHAR(50),
                    risk_profile VARCHAR(50),
                    thesis TEXT DEFAULT '',
                    plan_json TEXT NOT NULL,
                    source VARCHAR(50) DEFAULT 'ai_plan_builder',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    next_review_at TIMESTAMP,
                    last_reviewed_at TIMESTAMP,
                    archived_at TIMESTAMP,
                    deleted_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    paused_at TIMESTAMP,
                    activated_at TIMESTAMP,
                    status_reason VARCHAR(255)
                )
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_plans_user_id ON qd_plans(user_id)")
            try:
                cur.execute("ALTER TABLE qd_plans ADD COLUMN archived_at TIMESTAMP")
                cur.execute("ALTER TABLE qd_plans ADD COLUMN deleted_at TIMESTAMP")
                cur.execute("ALTER TABLE qd_plans ADD COLUMN completed_at TIMESTAMP")
                cur.execute("ALTER TABLE qd_plans ADD COLUMN paused_at TIMESTAMP")
                cur.execute("ALTER TABLE qd_plans ADD COLUMN activated_at TIMESTAMP")
                cur.execute("ALTER TABLE qd_plans ADD COLUMN status_reason VARCHAR(255)")
            except Exception:
                pass
        else:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS qd_plans (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    symbol TEXT NOT NULL,
                    asset_type TEXT,
                    plan_type TEXT,
                    status TEXT DEFAULT 'active',
                    total_budget REAL,
                    duration TEXT,
                    frequency TEXT,
                    risk_profile TEXT,
                    thesis TEXT DEFAULT '',
                    plan_json TEXT NOT NULL,
                    source TEXT DEFAULT 'ai_plan_builder',
                    created_at TEXT,
                    updated_at TEXT,
                    next_review_at TEXT,
                    last_reviewed_at TEXT,
                    archived_at TEXT,
                    deleted_at TEXT,
                    completed_at TEXT,
                    paused_at TEXT,
                    activated_at TEXT,
                    status_reason TEXT
                )
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_plans_user_id ON qd_plans(user_id)")
            try:
                cur.execute("ALTER TABLE qd_plans ADD COLUMN archived_at TEXT")
                cur.execute("ALTER TABLE qd_plans ADD COLUMN deleted_at TEXT")
                cur.execute("ALTER TABLE qd_plans ADD COLUMN completed_at TEXT")
                cur.execute("ALTER TABLE qd_plans ADD COLUMN paused_at TEXT")
                cur.execute("ALTER TABLE qd_plans ADD COLUMN activated_at TEXT")
                cur.execute("ALTER TABLE qd_plans ADD COLUMN status_reason TEXT")
            except Exception:
                pass
        conn.commit()
    except Exception as e:
        logger.error(f"ensure_table_exists failed: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass


def save_plan(user_id: int, payload: dict) -> dict:
    """
    Insert a new confirmed plan.
    Returns {'success': True, 'id': plan_id} or {'success': False, 'error': ...}
    """
    ensure_table_exists()

    plan_obj = payload.get("plan") or {}
    clean_plan = _sanitize_plan_json(plan_obj)

    plan_id = str(uuid.uuid4())
    now = _now_iso()

    conn, db_type = _get_db()
    try:
        cur = conn.cursor()
        if db_type == "postgres":
            cur.execute("""
                INSERT INTO qd_plans
                    (id, user_id, symbol, asset_type, plan_type, status,
                     total_budget, duration, frequency, risk_profile, thesis,
                     plan_json, source, created_at, updated_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW())
            """, (
                plan_id,
                user_id,
                payload.get("symbol", ""),
                payload.get("asset_type", ""),
                payload.get("plan_type", ""),
                payload.get("status", "active"),
                payload.get("total_budget"),
                payload.get("duration", ""),
                payload.get("frequency", ""),
                payload.get("risk_profile", ""),
                payload.get("thesis", ""),
                json.dumps(clean_plan, ensure_ascii=False),
                "ai_plan_builder",
            ))
        else:
            cur.execute("""
                INSERT INTO qd_plans
                    (id, user_id, symbol, asset_type, plan_type, status,
                     total_budget, duration, frequency, risk_profile, thesis,
                     plan_json, source, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                plan_id,
                user_id,
                payload.get("symbol", ""),
                payload.get("asset_type", ""),
                payload.get("plan_type", ""),
                payload.get("status", "active"),
                payload.get("total_budget"),
                payload.get("duration", ""),
                payload.get("frequency", ""),
                payload.get("risk_profile", ""),
                payload.get("thesis", ""),
                json.dumps(clean_plan, ensure_ascii=False),
                "ai_plan_builder",
                now,
                now,
            ))
        conn.commit()
        return {"success": True, "id": plan_id}
    except Exception as e:
        logger.error(f"save_plan failed: {e}", exc_info=True)
        return {"success": False, "error": str(e)}
    finally:
        try:
            conn.close()
        except Exception:
            pass


def get_plans(user_id: int) -> dict:
    """
    Fetch all plans for a user, newest first.
    Returns {'success': True, 'data': [...]} or {'success': False, 'error': ...}
    """
    ensure_table_exists()

    conn, db_type = _get_db()
    try:
        cur = conn.cursor()
        if db_type == "postgres":
            cur.execute("""
                SELECT id, user_id, symbol, asset_type, plan_type, status,
                       total_budget, duration, frequency, risk_profile, thesis,
                       plan_json, source, created_at, updated_at,
                       next_review_at, last_reviewed_at, archived_at, deleted_at,
                       completed_at, paused_at, activated_at, status_reason
                FROM qd_plans
                WHERE user_id = %s AND status != 'deleted'
                ORDER BY created_at DESC
            """, (user_id,))
        else:
            cur.execute("""
                SELECT id, user_id, symbol, asset_type, plan_type, status,
                       total_budget, duration, frequency, risk_profile, thesis,
                       plan_json, source, created_at, updated_at,
                       next_review_at, last_reviewed_at, archived_at, deleted_at,
                       completed_at, paused_at, activated_at, status_reason
                FROM qd_plans
                WHERE user_id = ? AND status != 'deleted'
                ORDER BY created_at DESC
            """, (user_id,))

        rows = cur.fetchall()
        plans = []
        for row in rows:
            d = dict(row)
            # Safely parse plan_json
            try:
                d["plan"] = json.loads(d.pop("plan_json", "{}") or "{}")
            except Exception:
                d["plan"] = {}
            # Convert timestamps to string for JSON serialisability
            ts_fields = (
                "created_at", "updated_at", "next_review_at", "last_reviewed_at",
                "archived_at", "deleted_at", "completed_at", "paused_at", "activated_at"
            )
            for ts_field in ts_fields:
                val = d.get(ts_field)
                if val and not isinstance(val, str):
                    d[ts_field] = str(val)
            plans.append(d)

        return {"success": True, "data": plans}
    except Exception as e:
        logger.error(f"get_plans failed: {e}", exc_info=True)
        return {"success": False, "error": str(e)}
    finally:
        try:
            conn.close()
        except Exception:
            pass


def get_plan_by_id(user_id: int, plan_id: str) -> dict:
    """Fetch a single plan by ID."""
    ensure_table_exists()
    conn, db_type = _get_db()
    try:
        cur = conn.cursor()
        query = """
            SELECT id, user_id, symbol, asset_type, plan_type, status,
                   total_budget, duration, frequency, risk_profile, thesis,
                   plan_json, source, created_at, updated_at,
                   next_review_at, last_reviewed_at, archived_at, deleted_at,
                   completed_at, paused_at, activated_at, status_reason
            FROM qd_plans
            WHERE id = {placeholder} AND user_id = {placeholder} AND status != 'deleted'
        """.replace("{placeholder}", "%s" if db_type == "postgres" else "?")
        
        cur.execute(query, (plan_id, user_id))
        row = cur.fetchone()
        if not row:
            return {"success": False, "error": "Plan not found"}
        
        d = dict(row)
        try:
            d["plan"] = json.loads(d.pop("plan_json", "{}") or "{}")
        except Exception:
            d["plan"] = {}
        ts_fields = (
            "created_at", "updated_at", "next_review_at", "last_reviewed_at",
            "archived_at", "deleted_at", "completed_at", "paused_at", "activated_at"
        )
        for ts_field in ts_fields:
            val = d.get(ts_field)
            if val and not isinstance(val, str):
                d[ts_field] = str(val)
                
        return {"success": True, "data": d}
    except Exception as e:
        logger.error(f"get_plan_by_id failed: {e}", exc_info=True)
        return {"success": False, "error": str(e)}
    finally:
        try:
            conn.close()
        except Exception:
            pass


def update_plan_status(user_id: int, plan_id: str, new_status: str, reason: str = None) -> dict:
    """Update status of a plan and corresponding timestamps."""
    ensure_table_exists()
    now = _now_iso()
    
    # Determine which timestamp field to update based on new status
    ts_field = None
    if new_status == 'deleted':
        ts_field = 'deleted_at'
    elif new_status == 'archived':
        ts_field = 'archived_at'
    elif new_status == 'completed':
        ts_field = 'completed_at'
    elif new_status == 'paused':
        ts_field = 'paused_at'
    elif new_status == 'active':
        ts_field = 'activated_at'

    conn, db_type = _get_db()
    try:
        cur = conn.cursor()
        
        # Build dynamic query
        ts_update = f", {ts_field} = {('%s' if db_type == 'postgres' else '?')}" if ts_field else ""
        reason_update = f", status_reason = {('%s' if db_type == 'postgres' else '?')}" if reason else ""
        
        query = f"""
            UPDATE qd_plans 
            SET status = {('%s' if db_type == 'postgres' else '?')}, 
                updated_at = {('%s' if db_type == 'postgres' else '?')}
                {ts_update}
                {reason_update}
            WHERE id = {('%s' if db_type == 'postgres' else '?')} AND user_id = {('%s' if db_type == 'postgres' else '?')}
        """
        
        params = [new_status, now]
        if ts_field:
            params.append(now if db_type == "sqlite" else "NOW()")
        if reason:
            params.append(reason)
        params.extend([plan_id, user_id])
        
        cur.execute(query, tuple(params))
        conn.commit()
        
        if cur.rowcount == 0:
            return {"success": False, "error": "Plan not found or unauthorized"}
            
        return {"success": True}
    except Exception as e:
        logger.error(f"update_plan_status failed: {e}", exc_info=True)
        return {"success": False, "error": str(e)}
    finally:
        try:
            conn.close()
        except Exception:
            pass


def update_plan_details(user_id: int, plan_id: str, payload: dict) -> dict:
    """Update basic properties of a plan."""
    ensure_table_exists()
    now = _now_iso()
    
    conn, db_type = _get_db()
    try:
        cur = conn.cursor()
        
        # We only allow updating these specific fields
        fields_to_update = []
        params = []
        
        if 'total_budget' in payload:
            fields_to_update.append(f"total_budget = {('%s' if db_type == 'postgres' else '?')}")
            params.append(payload['total_budget'])
            
        if 'duration' in payload:
            fields_to_update.append(f"duration = {('%s' if db_type == 'postgres' else '?')}")
            params.append(payload['duration'])
            
        if 'frequency' in payload:
            fields_to_update.append(f"frequency = {('%s' if db_type == 'postgres' else '?')}")
            params.append(payload['frequency'])
            
        if 'thesis' in payload:
            fields_to_update.append(f"thesis = {('%s' if db_type == 'postgres' else '?')}")
            params.append(payload['thesis'])
            
        if not fields_to_update:
            return {"success": False, "error": "No valid fields to update"}
            
        # Add updated_at
        fields_to_update.append(f"updated_at = {('%s' if db_type == 'postgres' else '?')}")
        params.append(now if db_type == 'sqlite' else 'NOW()')
        
        # Add WHERE params
        params.extend([plan_id, user_id])
        
        query = f"""
            UPDATE qd_plans 
            SET {', '.join(fields_to_update)}
            WHERE id = {('%s' if db_type == 'postgres' else '?')} AND user_id = {('%s' if db_type == 'postgres' else '?')} AND status != 'deleted'
        """
        
        cur.execute(query, tuple(params))
        conn.commit()
        
        if cur.rowcount == 0:
            return {"success": False, "error": "Plan not found or unauthorized"}
            
        return {"success": True}
    except Exception as e:
        logger.error(f"update_plan_details failed: {e}", exc_info=True)
        return {"success": False, "error": str(e)}
    finally:
        try:
            conn.close()
        except Exception:
            pass
