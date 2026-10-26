import uuid
import httpx
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
    Register an administrator profile in the local relational database; Supabase Auth is optional.
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

    supabase_uid = None
    access_token = None

    # 4. Attempt Supabase Auth sign-up if live Supabase is configured
    if settings.SUPABASE_URL and "placeholder" not in settings.SUPABASE_URL:
        try:
            async with httpx.AsyncClient() as client:
                signup_resp = await client.post(
                    f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/signup",
                    headers={
                        "apikey": settings.SUPABASE_KEY,
                        "Content-Type": "application/json"
                    },
                    json={
                        "email": payload.email,
                        "password": payload.password,
                        "data": {"full_name": payload.name, "role": "admin"}
                    },
                    timeout=10.0
                )
                if signup_resp.status_code in [200, 201]:
                    supa_data = signup_resp.json()
                    supabase_uid = supa_data.get("id") or (supa_data.get("user") or {}).get("id")
                    access_token = supa_data.get("access_token")
                elif signup_resp.status_code == 400:
                    err_msg = signup_resp.json().get("msg", "Supabase registration failed")
                    raise ConflictException(f"Supabase Auth error: {err_msg}")
        except (ConflictException, BadRequestException):
            raise
        except Exception as e:
            logger.warning(f"Supabase Auth signup call failed ({e}). Falling back to local provisioning.")

    if not supabase_uid:
        supabase_uid = str(uuid.uuid4())

    # 5. Provision Admin record in the configured relational database (SQLite by default)
    new_admin = Admin(
        email=payload.email,
        name=payload.name,
        supabase_user_id=supabase_uid,
        password_hash=get_password_hash(payload.password),
        role="admin",
        is_active=True
    )
    db.add(new_admin)
    await db.commit()
    await db.refresh(new_admin)

    # 6. Issue access token if Supabase did not return an immediate session
    if not access_token:
        access_token = create_access_token(
            subject=new_admin.supabase_user_id or new_admin.id,
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
    Authenticate administrator with Supabase Auth or local development fallback.
    """
    token_str = None
    supabase_uid = None

    # 1. Try Supabase Auth API if configured
    if settings.SUPABASE_URL and "placeholder" not in settings.SUPABASE_URL:
        try:
            async with httpx.AsyncClient() as client:
                login_resp = await client.post(
                    f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/token?grant_type=password",
                    headers={
                        "apikey": settings.SUPABASE_KEY,
                        "Content-Type": "application/json"
                    },
                    json={"email": payload.email, "password": payload.password},
                    timeout=10.0
                )
                if login_resp.status_code == 200:
                    data = login_resp.json()
                    token_str = data.get("access_token")
                    user_data = data.get("user") or {}
                    supabase_uid = user_data.get("id")
        except Exception as e:
            logger.warning(f"Supabase login request failed ({e}). Checking local database credentials.")

    # 2. Local database validation (fallback / offline test mode)
    stmt = select(Admin).where(Admin.email == payload.email)
    res = await db.execute(stmt)
    admin = res.scalar_one_or_none()

    if not token_str:
        if not admin:
            raise UnauthorizedException("Invalid admin email or password")
        if not verify_password(payload.password, admin.password_hash or ""):
            raise UnauthorizedException("Invalid admin email or password")

        token_str = create_access_token(
            subject=admin.supabase_user_id or admin.id,
            email=admin.email,
            role=admin.role
        )
    else:
        # Link admin record if Supabase login succeeded
        if admin and supabase_uid and not admin.supabase_user_id:
            admin.supabase_user_id = supabase_uid
            await db.commit()

    return Token(access_token=token_str, token_type="bearer", expires_in=24 * 3600)

@router.get("/me", response_model=AdminOut)
async def get_me(current_admin: Admin = Depends(get_current_admin)):
    """Return currently authenticated administrator profile."""
    return current_admin

@router.post("/logout")
async def logout(current_admin: Admin = Depends(get_current_admin)):
    """Acknowledge administrator logout."""
    return {"message": "Successfully logged out"}
