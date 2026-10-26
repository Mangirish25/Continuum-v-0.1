import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.database import AsyncSessionLocal, Base, engine
from app.db.models.all_models import Admin


async def initialize_database():
    """Create the local schema and initial admin without deleting application data."""
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Admin).where(Admin.email == settings.INITIAL_ADMIN_EMAIL))
        if result.scalar_one_or_none() is None:
            session.add(Admin(
                email=settings.INITIAL_ADMIN_EMAIL,
                password_hash=get_password_hash(settings.INITIAL_ADMIN_PASSWORD),
                name=settings.INITIAL_ADMIN_NAME,
            ))
            await session.commit()


if __name__ == "__main__":
    asyncio.run(initialize_database())
