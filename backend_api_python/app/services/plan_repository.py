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
                    last_reviewed_at TIMESTAMP
                )
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_plans_user_id ON qd_plans(user_id)")
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
                    last_reviewed_at TEXT
                )
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_plans_user_id ON qd_plans(user_id)")
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
                       next_review_at, last_reviewed_at
                FROM qd_plans
                WHERE user_id = %s
                ORDER BY created_at DESC
            """, (user_id,))
        else:
            cur.execute("""
                SELECT id, user_id, symbol, asset_type, plan_type, status,
                       total_budget, duration, frequency, risk_profile, thesis,
                       plan_json, source, created_at, updated_at,
                       next_review_at, last_reviewed_at
                FROM qd_plans
                WHERE user_id = ?
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
            for ts_field in ("created_at", "updated_at", "next_review_at", "last_reviewed_at"):
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
