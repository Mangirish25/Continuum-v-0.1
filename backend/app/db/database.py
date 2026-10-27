from typing import AsyncGenerator
from sqlalchemy import create_engine, event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Base class for ORM models
Base = declarative_base()


def upgrade_existing_sqlite_schema(connection) -> None:
    """Add model fields introduced after the repository's existing SQLite snapshot."""
    if connection.dialect.name != "sqlite":
        return

    existing_tables = {
        row[0] for row in connection.exec_driver_sql(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
    }
    additions = {
        "admins": {
            "is_active": "BOOLEAN NOT NULL DEFAULT 1",
            "role": "VARCHAR NOT NULL DEFAULT 'admin'",
        },
        "employee_resources": {
            "last_successful_sync_at": "DATETIME",
        },
        "handovers": {
            "reversed_at": "DATETIME",
            "reversal_reason": "TEXT",
        },
    }
    for table_name, columns in additions.items():
        if table_name not in existing_tables:
            continue
        current_columns = {
            row[1] for row in connection.exec_driver_sql(f'PRAGMA table_info("{table_name}")').fetchall()
        }
        for column_name, definition in columns.items():
            if column_name not in current_columns:
                connection.exec_driver_sql(
                    f'ALTER TABLE "{table_name}" ADD COLUMN "{column_name}" {definition}'
                )

# Configure database URLs
import os

db_url = settings.DATABASE_URL
sync_db_url = db_url.replace("+aiosqlite", "").replace("+asyncpg", "+psycopg2")

# Handle SQLite vs PostgreSQL async engine configuration
if "sqlite" in db_url:
    # Anchor relative SQLite file paths to the backend directory to ensure consistency across execution directories
    if ":///" in db_url and ":memory:" not in db_url:
        path_part = db_url.split(":///", 1)[1]
        if not os.path.isabs(path_part):
            backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            abs_db_file = os.path.abspath(os.path.join(backend_dir, path_part)).replace("\\", "/")
            os.makedirs(os.path.dirname(abs_db_file), exist_ok=True)
            db_url = f"sqlite+aiosqlite:///{abs_db_file}"
            sync_db_url = f"sqlite:///{abs_db_file}"
    elif "sqlite" in db_url and ":memory:" not in db_url:
        path_part = db_url.split("sqlite+aiosqlite:///", 1)[-1].split("sqlite:///", 1)[-1]
        if os.path.isabs(path_part):
            abs_db_file = os.path.abspath(path_part)
            os.makedirs(os.path.dirname(abs_db_file), exist_ok=True)
            abs_db_file = abs_db_file.replace(os.sep, "/")
            db_url = f"sqlite+aiosqlite:///{abs_db_file}"
            sync_db_url = f"sqlite:///{abs_db_file}"
    elif "sqlite" in db_url:
        sync_db_url = db_url.replace("sqlite+aiosqlite://", "sqlite://")

    async_db_url = db_url if "sqlite+aiosqlite" in db_url else db_url.replace("sqlite://", "sqlite+aiosqlite://")
    engine = create_async_engine(async_db_url, connect_args={"check_same_thread": False})
    sync_engine = create_engine(sync_db_url or db_url, connect_args={"check_same_thread": False})
else:
    # asyncpg expects 'ssl' parameter, not 'sslmode' (which is psycopg2/libpq parameter)
    if "+asyncpg" in db_url and "sslmode=" in db_url:
        db_url = db_url.replace("sslmode=", "ssl=")
    sync_db_url = db_url.replace("+asyncpg", "+psycopg2")
    if "+psycopg2" in sync_db_url:
        if "+asyncpg" in sync_db_url:
            sync_db_url = sync_db_url.replace("+asyncpg", "+psycopg2")
        if "ssl=" in sync_db_url and "sslmode=" not in sync_db_url:
            sync_db_url = sync_db_url.replace("ssl=", "sslmode=")

    # Disable prepared statement caching for transaction-pooling PostgreSQL deployments.
    async_connect_args = {}
    if "+asyncpg" in db_url:
        async_connect_args = {
            "statement_cache_size": 0,
            "prepared_statement_name_func": lambda: "",
        }

    engine = create_async_engine(
        db_url,
        echo=False,
        pool_pre_ping=True,
        connect_args=async_connect_args
    )
    sync_engine = create_engine(sync_db_url, echo=False, pool_pre_ping=True)

if "sqlite" in db_url:
    @event.listens_for(engine.sync_engine, "connect")
    def enable_async_sqlite_foreign_keys(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    @event.listens_for(sync_engine, "connect")
    def enable_sync_sqlite_foreign_keys(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
