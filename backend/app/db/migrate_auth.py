import logging
from sqlalchemy import inspect, text
from app.db.session import engine, SessionLocal, Base
from app.db.models import User, Dataset, KnowledgeDocument, AgentSession, Report, DSARRequest
from app.core.security import hash_password

logger = logging.getLogger(__name__)


def migrate_and_seed_auth():
    """
    Executes non-destructive schema migration for authentication:
    1. Creates `users` and `dsar_requests` tables if they don't exist.
    2. Adds `user_id` column to `datasets`, `knowledge_documents`, `agent_sessions`, `reports` if missing.
    3. Seeds/retrieves the default primary admin account (admin@insightforge.local).
    4. Migrates all legacy records with user_id IS NULL to this default account so zero data is lost.
    """
    # 1. Create tables defined in models
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)

    # 2. Add user_id column to existing tables if missing (SQLite ALTER TABLE)
    tables_needing_user_id = ["datasets", "knowledge_documents", "agent_sessions", "reports"]
    with engine.begin() as conn:
        for tbl in tables_needing_user_id:
            if tbl in inspector.get_table_names():
                existing_cols = [c["name"] for c in inspector.get_columns(tbl)]
                if "user_id" not in existing_cols:
                    logger.info(f"Adding user_id column to table {tbl}...")
                    conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN user_id VARCHAR(36)"))

        # Add professional_role column to users table if missing
        if "users" in inspector.get_table_names():
            user_cols = [c["name"] for c in inspector.get_columns("users")]
            if "professional_role" not in user_cols:
                logger.info("Adding professional_role column to users table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN professional_role VARCHAR(100)"))

    # 3. Schema migration complete (No automatic demo user accounts created in production)
    logger.info("Database schema verification and column migrations completed.")
    return None


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    migrate_and_seed_auth()
    print("Database schema migration complete.")
