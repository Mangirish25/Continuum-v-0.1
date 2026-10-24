from typing import AsyncGenerator
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Base class for ORM models
Base = declarative_base()

# Configure database URLs
import os

db_url = settings.DATABASE_URL
sync_db_url = settings.SYNC_DATABASE_URL or settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")

# Handle SQLite vs PostgreSQL async engine configuration
if "sqlite" in db_url:
    # Anchor relative SQLite file paths to the backend directory to ensure consistency across execution directories
    if ":///" in db_url and ":memory:" not in db_url:
        path_part = db_url.split(":///", 1)[1]
        if not os.path.isabs(path_part):
            backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            abs_db_file = os.path.join(backend_dir, path_part).replace("\\", "/")
            db_url = f"sqlite+aiosqlite:///{abs_db_file}"
            sync_db_url = f"sqlite:///{abs_db_file}"

    async_db_url = db_url if "sqlite+aiosqlite" in db_url else db_url.replace("sqlite://", "sqlite+aiosqlite://")
    engine = create_async_engine(async_db_url, connect_args={"check_same_thread": False})
    sync_engine = create_engine(sync_db_url or db_url, connect_args={"check_same_thread": False})
else:
    # asyncpg expects 'ssl' parameter, not 'sslmode' (which is psycopg2/libpq parameter)
    if "+asyncpg" in db_url and "sslmode=" in db_url:
        db_url = db_url.replace("sslmode=", "ssl=")
    if "+psycopg2" in sync_db_url:
        if "+asyncpg" in sync_db_url:
            sync_db_url = sync_db_url.replace("+asyncpg", "+psycopg2")
        if "ssl=" in sync_db_url and "sslmode=" not in sync_db_url:
            sync_db_url = sync_db_url.replace("ssl=", "sslmode=")

    # connect_args for asyncpg: disable prepared statement caching for Supabase PgBouncer transaction pooler
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
