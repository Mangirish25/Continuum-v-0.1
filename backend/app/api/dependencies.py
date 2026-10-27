from typing import AsyncGenerator
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.core.security import verify_access_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.db.models.all_models import Admin

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_admin(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Admin:
    """
    Verify a locally issued access token and ensure the user is an active administrator.
    """
    claims = verify_access_token(token)
    if not claims or claims.get("role") != "admin":
        raise UnauthorizedException("Invalid or expired authentication token")

    sub: str = claims["sub"]
    stmt = select(Admin).where(Admin.id == sub)
    result = await db.execute(stmt)
    admin = result.scalar_one_or_none()

    if admin:
        if not admin.is_active or admin.role != "admin":
            raise ForbiddenException("User account is deactivated or not authorized as an administrator.")
        return admin
    raise UnauthorizedException("Administrator account not found")
