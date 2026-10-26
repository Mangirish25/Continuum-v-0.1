from typing import AsyncGenerator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.db.database import get_db
from app.core.config import settings
from app.core.security import verify_supabase_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.db.models.all_models import Admin
from app.core.logging import logger

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_admin(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Admin:
    """
    Verify Supabase or local access token and ensure the user is an authorized Continuum administrator.
    """
    claims = await verify_supabase_token(token)
    if not claims or not claims.get("sub"):
        raise UnauthorizedException("Invalid or expired authentication token")

    sub: str = claims["sub"]
    email: str = claims.get("email") or ""

    # Look up administrator by Supabase user ID, primary key ID, or email
    stmt = select(Admin).where(
        or_(
            Admin.supabase_user_id == sub,
            Admin.id == sub,
            Admin.email == email
        )
    )
    result = await db.execute(stmt)
    admin = result.scalar_one_or_none()

    if admin:
        if not admin.is_active or admin.role != "admin":
            raise ForbiddenException("User account is deactivated or not authorized as an administrator.")

        # Update Supabase user ID mapping if missing
        if not admin.supabase_user_id:
            admin.supabase_user_id = sub
            await db.commit()
            await db.refresh(admin)

        return admin

    # If admin record is missing locally:
    # Under development mode "open", auto-provision administrator profile from authenticated Supabase identity
    if settings.ADMIN_REGISTRATION_MODE == "open" and email:
        logger.info(f"Auto-provisioning Continuum administrator profile for Supabase user {sub} ({email}) under open registration mode")
        meta = claims.get("user_metadata", {})
        name = meta.get("full_name") or meta.get("name") or email.split("@")[0].capitalize()

        admin = Admin(
            email=email,
            supabase_user_id=sub,
            name=name,
            role="admin",
            is_active=True
        )
        db.add(admin)
        await db.commit()
        await db.refresh(admin)
        return admin

    # If restricted mode and not registered
    raise ForbiddenException("User is authenticated but not authorized as a Continuum administrator.")
