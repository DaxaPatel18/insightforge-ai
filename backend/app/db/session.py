import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_SQLITE_URL = f"sqlite:///{os.path.join(BACKEND_DIR, 'insightforge.db').replace(os.sep, '/')}"

try:
    from dotenv import load_dotenv
    # Load environment variables from backend/.env or root .env if present
    load_dotenv(os.path.join(BACKEND_DIR, ".env"))
    load_dotenv(os.path.join(os.path.dirname(BACKEND_DIR), ".env"))
except Exception:
    pass

DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_SQLITE_URL)
if DATABASE_URL == "sqlite:///./insightforge.db":
    DATABASE_URL = DEFAULT_SQLITE_URL
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+psycopg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

connect_args = {}
engine_kwargs = {"pool_pre_ping": True}

if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine_kwargs["connect_args"] = connect_args
else:
    # Production PostgreSQL connection pool configuration
    engine_kwargs["pool_size"] = int(os.getenv("DB_POOL_SIZE", "10"))
    engine_kwargs["max_overflow"] = int(os.getenv("DB_MAX_OVERFLOW", "20"))
    engine_kwargs["pool_recycle"] = int(os.getenv("DB_POOL_RECYCLE", "1800"))
    engine_kwargs["pool_timeout"] = int(os.getenv("DB_POOL_TIMEOUT", "30"))

engine = create_engine(
    DATABASE_URL,
    **engine_kwargs,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def check_db_connection() -> dict:
    """Check database health and return connectivity status and dialect."""
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "healthy", "dialect": engine.dialect.name}
    except Exception as exc:
        return {"status": "unhealthy", "error": str(exc), "dialect": engine.dialect.name}


def get_db():
    """Dependency for obtaining a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables and auth schema."""
    from app.db import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    try:
        from app.db.migrate_auth import migrate_and_seed_auth
        migrate_and_seed_auth()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"migrate_and_seed_auth notice: {e}")
