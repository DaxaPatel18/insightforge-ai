"""InsightForge AI - SQLite to PostgreSQL Data Migration Tool

Transfers all records from a local SQLite database to a PostgreSQL instance
with dependency ordering, foreign-key integrity, transaction safety, and verification.

Usage:
    # Dry run check:
    python -m app.db.migrate_to_postgres --dry-run

    # Execute migration to PostgreSQL:
    python -m app.db.migrate_to_postgres --postgres-url "postgresql+psycopg2://user:password@localhost:5432/insightforge_db"
"""
import argparse
import logging
import os
import sys
from typing import Dict, List, Type

from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.orm import Session, sessionmaker

# Import models
from app.db.session import Base, DEFAULT_SQLITE_URL
from app.db.models import (
    User,
    Dataset,
    DataTransformation,
    MLExperiment,
    AnalysisHistory,
    AgentSession,
    AgentMessage,
    KnowledgeDocument,
    DocumentChunk,
    Report,
    SystemEvaluation,
    DSARRequest,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("db_migrator")

# Ordered model list respecting foreign key hierarchies
ORDERED_MODELS: List[Type[Base]] = [
    User,
    Dataset,
    DataTransformation,
    MLExperiment,
    AnalysisHistory,
    AgentSession,
    AgentMessage,
    KnowledgeDocument,
    DocumentChunk,
    Report,
    SystemEvaluation,
    DSARRequest,
]


def get_sqlite_engine(sqlite_path: str):
    url = f"sqlite:///{os.path.abspath(sqlite_path).replace(os.sep, '/')}"
    return create_engine(url, connect_args={"check_same_thread": False})


def get_postgres_engine(postgres_url: str):
    if postgres_url.startswith("postgres://"):
        postgres_url = postgres_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif postgres_url.startswith("postgresql://") and "+psycopg" not in postgres_url:
        postgres_url = postgres_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return create_engine(postgres_url, pool_pre_ping=True)


def count_table_rows(engine, model: Type[Base]) -> int:
    inspector = inspect(engine)
    if model.__tablename__ not in inspector.get_table_names():
        return 0
    with engine.connect() as conn:
        res = conn.execute(text(f"SELECT COUNT(*) FROM {model.__tablename__}"))
        return res.scalar() or 0


def migrate_data(
    sqlite_path: str,
    postgres_url: str,
    dry_run: bool = False,
    batch_size: int = 500,
) -> Dict[str, Dict[str, int]]:
    logger.info("Initializing migration engines...")
    src_engine = get_sqlite_engine(sqlite_path)
    src_session_factory = sessionmaker(bind=src_engine)

    stats = {}

    if dry_run:
        logger.info("=== DRY RUN MODE: Scanning Source SQLite Database ===")
        for model in ORDERED_MODELS:
            cnt = count_table_rows(src_engine, model)
            stats[model.__tablename__] = {"source_count": cnt, "migrated": 0}
            logger.info(f"Table '{model.__tablename__}': {cnt} records found in SQLite")
        logger.info("Dry run complete. No modifications were made to PostgreSQL.")
        return stats

    dst_engine = get_postgres_engine(postgres_url)
    dst_session_factory = sessionmaker(bind=dst_engine)

    # 1. Create target tables if they do not exist
    logger.info("Ensuring PostgreSQL schema and tables exist...")
    Base.metadata.create_all(bind=dst_engine)

    # 2. Iterate each table in dependency order
    for model in ORDERED_MODELS:
        table_name = model.__tablename__
        src_count = count_table_rows(src_engine, model)
        stats[table_name] = {"source_count": src_count, "migrated": 0}

        if src_count == 0:
            logger.info(f"Skipping empty table '{table_name}'.")
            continue

        logger.info(f"Migrating {src_count} records for table '{table_name}'...")

        with src_session_factory() as src_session, dst_session_factory() as dst_session:
            # Query source records
            records = src_session.query(model).all()
            migrated_count = 0

            for record in records:
                # Merge into destination session
                dst_session.merge(record)
                migrated_count += 1

                if migrated_count % batch_size == 0:
                    dst_session.commit()
                    logger.info(f"  [{table_name}] Committed {migrated_count}/{src_count} records")

            dst_session.commit()
            stats[table_name]["migrated"] = migrated_count
            logger.info(f"Successfully migrated {migrated_count} records for '{table_name}'.")

    # 3. Final Verification
    logger.info("=== VERIFYING POSTGRESQL RECORD COUNTS ===")
    all_match = True
    for model in ORDERED_MODELS:
        tbl = model.__tablename__
        src_c = stats[tbl]["source_count"]
        dst_c = count_table_rows(dst_engine, model)
        stats[tbl]["dest_count"] = dst_c
        match = (src_c == dst_c)
        if not match:
            all_match = False
            logger.warning(f"Discrepancy in '{tbl}': SQLite had {src_c}, PostgreSQL has {dst_c}")
        else:
            logger.info(f"Verified '{tbl}': {dst_c} records matched exactly.")

    if all_match:
        logger.info("MIGRATION COMPLETED SUCCESSFULLY WITH 100% PARITY.")
    else:
        logger.warning("Migration completed with count warnings. Review logs above.")

    return stats


def main():
    parser = argparse.ArgumentParser(description="Migrate InsightForge AI SQLite database to PostgreSQL.")
    parser.add_argument(
        "--sqlite-path",
        default=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "insightforge.db"),
        help="Path to source SQLite file (default: backend/insightforge.db)",
    )
    parser.add_argument(
        "--postgres-url",
        default=os.getenv("DATABASE_URL", ""),
        help="Target PostgreSQL connection URL",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Inspect source tables and row counts without migrating.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Batch size for database commit intervals",
    )

    args = parser.parse_args()

    if not os.path.exists(args.sqlite_path):
        logger.error(f"Source SQLite database not found at: {args.sqlite_path}")
        sys.exit(1)

    if not args.dry_run and not args.postgres_url:
        logger.error("Please supply --postgres-url or configure DATABASE_URL in environment.")
        sys.exit(1)

    migrate_data(
        sqlite_path=args.sqlite_path,
        postgres_url=args.postgres_url,
        dry_run=args.dry_run,
        batch_size=args.batch_size,
    )


if __name__ == "__main__":
    main()
