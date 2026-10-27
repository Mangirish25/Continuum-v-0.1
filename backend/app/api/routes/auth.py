from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.core.config import settings
from app.schemas.auth import (
    AdminLogin, Token, AdminOut,
    AdminRegisterRequest, AdminRegisterResponse
)
from app.db.models.all_models import Admin
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.exceptions import (
    UnauthorizedException, BadRequestException,
    ConflictException, ForbiddenException
)
from app.api.dependencies import get_current_admin
from app.core.logging import logger

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=AdminRegisterResponse, status_code=status.HTTP_201_CREATED)
async def register_admin(
    payload: AdminRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Register an administrator account in the local relational database.
    """
    # 1. Validate password confirmation if provided
    if payload.confirm_password and payload.password != payload.confirm_password:
        raise BadRequestException("Passwords do not match.")

    # 2. Check registration policy
    if settings.ADMIN_REGISTRATION_MODE == "restricted":
        if not payload.invite_code or payload.invite_code != settings.REGISTRATION_INVITE_CODE:
            raise ForbiddenException("Invalid administrator invitation code. Registration is restricted.")

    # 3. Check duplicate email in application database
    existing_stmt = select(Admin).where(Admin.email == payload.email)
    existing_admin = (await db.execute(existing_stmt)).scalar_one_or_none()
    if existing_admin:
        raise ConflictException(f"An administrator account with email '{payload.email}' already exists.")

    # 4. Provision the administrator record in the configured relational database.
    new_admin = Admin(
        email=payload.email,
        name=payload.name,
        password_hash=get_password_hash(payload.password),
        role="admin",
        is_active=True
    )
    db.add(new_admin)
    await db.commit()
    await db.refresh(new_admin)

    access_token = create_access_token(
        subject=new_admin.id,
        email=new_admin.email,
        role="admin"
    )

    logger.info(f"Administrator '{new_admin.name}' ({new_admin.email}) registered successfully.")

    return AdminRegisterResponse(
        message="Administrator registered successfully.",
        admin=AdminOut.model_validate(new_admin),
        access_token=access_token,
        token_type="bearer"
    )

@router.post("/login", response_model=Token)
async def login(payload: AdminLogin, db: AsyncSession = Depends(get_db)):
    """
    Authenticate an administrator using the locally stored email and password.
    """
    stmt = select(Admin).where(Admin.email == payload.email)
    res = await db.execute(stmt)
    admin = res.scalar_one_or_none()

    if not admin or not verify_password(payload.password, admin.password_hash or ""):
        raise UnauthorizedException("Invalid admin email or password")
    if not admin.is_active or admin.role != "admin":
        raise ForbiddenException("User account is deactivated or not authorized as an administrator.")

    token_str = create_access_token(
        subject=admin.id,
        email=admin.email,
        role=admin.role
    )

    return Token(access_token=token_str, token_type="bearer", expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)

@router.get("/me", response_model=AdminOut)
async def get_me(current_admin: Admin = Depends(get_current_admin)):
    """Return currently authenticated administrator profile."""
    return current_admin

@router.post("/logout")
async def logout(current_admin: Admin = Depends(get_current_admin)):
    """Acknowledge administrator logout."""
    return {"message": "Successfully logged out"}
