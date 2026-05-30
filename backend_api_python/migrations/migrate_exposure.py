import traceback
from app.utils.db import get_db_connection

def run_migration():
    print("Starting Exposure Registry Archive Migration...")
    try:
        with get_db_connection() as db:
            cur = db.cursor()
            
            # 1. Add status column
            try:
                cur.execute("ALTER TABLE qd_manual_positions ADD COLUMN status VARCHAR(20) DEFAULT 'open';")
                print("Added column: status")
            except Exception as e:
                print("Column status already exists or failed:", e)
                db.rollback()
            
            # 2. Add closed_at column
            try:
                cur.execute("ALTER TABLE qd_manual_positions ADD COLUMN closed_at TIMESTAMP NULL;")
                print("Added column: closed_at")
            except Exception as e:
                print("Column closed_at already exists or failed:", e)
                db.rollback()
                
            # 3. Add archived_at column
            try:
                cur.execute("ALTER TABLE qd_manual_positions ADD COLUMN archived_at TIMESTAMP NULL;")
                print("Added column: archived_at")
            except Exception as e:
                print("Column archived_at already exists or failed:", e)
                db.rollback()

            # 4. Add close_note column
            try:
                cur.execute("ALTER TABLE qd_manual_positions ADD COLUMN close_note TEXT NULL;")
                print("Added column: close_note")
            except Exception as e:
                print("Column close_note already exists or failed:", e)
                db.rollback()

            # 5. Drop constraint
            try:
                cur.execute("ALTER TABLE qd_manual_positions DROP CONSTRAINT IF EXISTS qd_manual_positions_user_id_market_symbol_side_group_n_key;")
                cur.execute("ALTER TABLE qd_manual_positions DROP CONSTRAINT IF EXISTS qd_manual_positions_user_id_market_symbol_side_group_name_key;")
                print("Dropped legacy unique constraint")
            except Exception as e:
                print("Failed to drop unique constraint:", e)
                db.rollback()

            # 6. Create partial unique index
            try:
                cur.execute("""
                    CREATE UNIQUE INDEX IF NOT EXISTS idx_manual_positions_unique_open 
                    ON qd_manual_positions(user_id, market, symbol, side, group_name) 
                    WHERE status = 'open';
                """)
                print("Created partial unique index: idx_manual_positions_unique_open")
            except Exception as e:
                print("Failed to create partial unique index:", e)
                db.rollback()

            # 7. Create status index
            try:
                cur.execute("CREATE INDEX IF NOT EXISTS idx_manual_positions_status ON qd_manual_positions(status);")
                print("Created index: idx_manual_positions_status")
            except Exception as e:
                print("Failed to create status index:", e)
                db.rollback()

            # 8. Backfill legacy records
            try:
                cur.execute("UPDATE qd_manual_positions SET status = 'open' WHERE status IS NULL;")
                print("Backfilled legacy records to status='open'")
            except Exception as e:
                print("Failed to backfill status:", e)
                db.rollback()

            db.commit()
            cur.close()
            print("Migration completed successfully.")
    except Exception as e:
        print("Migration failed:", e)
        traceback.print_exc()

if __name__ == "__main__":
    run_migration()
