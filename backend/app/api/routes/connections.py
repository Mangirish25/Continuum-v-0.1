import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.schemas.connection import ConnectionAuthorizeResponse, ConnectionOut
from app.schemas.jira import JiraWorkspaceConfig, JiraWorkspaceStatus, JiraWorkspaceVerifyResponse
from app.db.models.all_models import OAuthConnection, Admin, EmployeeResource
from app.api.dependencies import get_current_admin
from app.core.config import settings
from app.core.security import encrypt_token, decrypt_token
from app.core.exceptions import BadRequestException, NotFoundException
from app.integrations.jira import JiraConnector
from app.core.logging import logger

router = APIRouter(prefix="/connections", tags=["Connections"])

# ── Centralized Jira Workspace Management (Admin-Controlled) ───────────────

@router.get("/jira", response_model=JiraWorkspaceStatus)
async def get_jira_status(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """View centralized company Jira workspace identity and connection status."""
    stmt = select(OAuthConnection).where(OAuthConnection.provider == "JIRA")
    conn = (await db.execute(stmt)).scalar_one_or_none()
    if not conn:
        return JiraWorkspaceStatus(
            connected=False,
            verified=False,
            status="NOT_CONFIGURED",
            available_projects=[]
        )

    res_stmt = select(EmployeeResource).where(EmployeeResource.provider == "JIRA")
    jira_resources = (await db.execute(res_stmt)).scalars().all()
    last_sync = max([r.last_synced_at for r in jira_resources if r.last_synced_at], default=None)

    admin_email = None
    if conn.scopes and isinstance(conn.scopes, list):
        for s in conn.scopes:
            if s.startswith("admin_email:"):
                admin_email = s.split(":", 1)[1] or None

    token = decrypt_token(conn.access_token_encrypted)
    jira_conn = JiraConnector(access_token=token, site_url=conn.provider_account_id)
    projects = await jira_conn.list_resources()

    return JiraWorkspaceStatus(
        connected=True,
        verified=True,
        workspace_url=conn.provider_account_id,
        admin_email=admin_email,
        status="CONNECTED",
        last_synced_at=last_sync,
        resources_count=len(jira_resources),
        available_projects=projects
    )

@router.post("/jira/configure", response_model=JiraWorkspaceStatus)
async def configure_jira_workspace(
    payload: JiraWorkspaceConfig,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Centrally configure and verify company Jira workspace credentials."""
    clean_url = payload.workspace_url.strip().rstrip("/")
    if not clean_url.startswith("http://") and not clean_url.startswith("https://"):
        clean_url = f"https://{clean_url}"

    auth_credential = payload.api_token.strip()
    if payload.admin_email and ":" not in auth_credential and not auth_credential.startswith("Basic ") and not auth_credential.startswith("Bearer "):
        token_to_encrypt = f"{payload.admin_email.strip()}:{auth_credential}"
    else:
        token_to_encrypt = auth_credential

    # Verify connection against Jira API
    test_conn = JiraConnector(access_token=token_to_encrypt, site_url=clean_url)
    is_valid = await test_conn.validate_connection()
    if not is_valid:
        raise BadRequestException(f"Failed to verify Jira workspace connection at '{clean_url}'. Please check workspace URL, admin email, and API token.")

    encrypted = encrypt_token(token_to_encrypt)
    scopes = ["read:jira-work", f"admin_email:{payload.admin_email or ''}", "verified:true"]

    stmt = select(OAuthConnection).where(OAuthConnection.provider == "JIRA")
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        existing.provider_account_id = clean_url
        existing.access_token_encrypted = encrypted
        existing.scopes = scopes
        conn = existing
    else:
        conn = OAuthConnection(
            provider="JIRA",
            connection_type="ADMIN",
            access_token_encrypted=encrypted,
            provider_account_id=clean_url,
            scopes=scopes
        )
        db.add(conn)

    # Transition any pending Jira resources to READY
    res_stmt = select(EmployeeResource).where(EmployeeResource.provider == "JIRA", EmployeeResource.status == "NEEDS_AUTH")
    pending_resources = (await db.execute(res_stmt)).scalars().all()
    for pr in pending_resources:
        pr.status = "READY"

    await db.commit()
    await db.refresh(conn)

    projects = await test_conn.list_resources()
    logger.info(f"Administrator {current_admin.email} configured centralized Jira workspace: {clean_url}")

    return JiraWorkspaceStatus(
        connected=True,
        verified=True,
        workspace_url=clean_url,
        admin_email=payload.admin_email,
        status="CONNECTED",
        resources_count=len(pending_resources),
        available_projects=projects
    )

@router.post("/jira/verify", response_model=JiraWorkspaceVerifyResponse)
async def verify_jira_workspace(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Re-test connection with currently stored Jira credentials."""
    stmt = select(OAuthConnection).where(OAuthConnection.provider == "JIRA")
    conn = (await db.execute(stmt)).scalar_one_or_none()
    if not conn:
        raise NotFoundException("Jira workspace has not been configured yet.")

    token = decrypt_token(conn.access_token_encrypted)
    jira_conn = JiraConnector(access_token=token, site_url=conn.provider_account_id)
    is_valid = await jira_conn.validate_connection()
    if is_valid:
        return JiraWorkspaceVerifyResponse(
            verified=True,
            status="VERIFIED",
            message=f"Successfully verified connection to Jira workspace at {conn.provider_account_id}.",
            workspace_url=conn.provider_account_id
        )
    else:
        return JiraWorkspaceVerifyResponse(
            verified=False,
            status="FAILED",
            message=f"Failed to authenticate with Jira workspace at {conn.provider_account_id}. Please verify token.",
            workspace_url=conn.provider_account_id
        )

@router.delete("/jira", status_code=status.HTTP_200_OK)
async def disconnect_jira_workspace(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Safely disconnect centralized Jira workspace without deleting existing resources or employee attribution."""
    stmt = select(OAuthConnection).where(OAuthConnection.provider == "JIRA")
    conn = (await db.execute(stmt)).scalar_one_or_none()
    if conn:
        await db.delete(conn)

        # Safely transition mapped Jira resources to NEEDS_AUTH
        res_stmt = select(EmployeeResource).where(EmployeeResource.provider == "JIRA")
        jira_resources = (await db.execute(res_stmt)).scalars().all()
        for r in jira_resources:
            r.status = "NEEDS_AUTH"

        await db.commit()
        logger.info(f"Administrator {current_admin.email} disconnected centralized Jira workspace.")

    return {"message": "Centralized Jira workspace successfully disconnected.", "status": "DISCONNECTED"}

@router.get("/jira/projects", response_model=List[Dict[str, Any]])
async def list_jira_workspace_projects(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """List available Jira projects in company workspace for mapping."""
    stmt = select(OAuthConnection).where(OAuthConnection.provider == "JIRA")
    conn = (await db.execute(stmt)).scalar_one_or_none()
    token = decrypt_token(conn.access_token_encrypted) if conn else None
    site_url = conn.provider_account_id if conn else None

    jira_conn = JiraConnector(access_token=token, site_url=site_url)
    return await jira_conn.list_resources()

# ── General Connections Routes ─────────────────────────────────────────────

@router.get("", response_model=List[ConnectionOut])
async def list_connections(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    stmt = select(OAuthConnection)
    return (await db.execute(stmt)).scalars().all()

@router.get("/{provider}/authorize", response_model=ConnectionAuthorizeResponse)
async def authorize_oauth(
    provider: str,
    connection_type: str = Query("ADMIN", description="ADMIN or RESOURCE_OWNER"),
    current_admin: Admin = Depends(get_current_admin)
):
    provider_upper = provider.upper()
    state = str(uuid.uuid4())

    if provider_upper == "GOOGLE":
        url = f"https://accounts.google.com/o/oauth2/v2/auth?client_id={settings.GOOGLE_CLIENT_ID}&redirect_uri={settings.GOOGLE_REDIRECT_URI}&response_type=code&scope=https://www.googleapis.com/auth/drive.readonly&state={state}"
    elif provider_upper == "NOTION":
        url = f"https://api.notion.com/v1/oauth/authorize?client_id={settings.NOTION_CLIENT_ID}&response_type=code&owner=user&redirect_uri={settings.NOTION_REDIRECT_URI}&state={state}"
    elif provider_upper == "JIRA":
        url = f"https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id={settings.JIRA_CLIENT_ID}&scope=read:jira-work&redirect_uri={settings.JIRA_REDIRECT_URI}&state={state}&response_type=code"
    else:
        url = f"https://github.com/login/oauth/authorize?state={state}"

    return ConnectionAuthorizeResponse(authorization_url=url, state=state)

@router.get("/{provider}/callback", response_model=ConnectionOut)
async def oauth_callback(
    provider: str,
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    provider_upper = provider.upper()
    
    conn = OAuthConnection(
        provider=provider_upper,
        connection_type="ADMIN",
        access_token_encrypted=encrypt_token(f"mock_token_{provider_upper.lower()}_{code}"),
        refresh_token_encrypted=encrypt_token(f"mock_refresh_{code}"),
        scopes=["read"],
        provider_account_id=f"acc_{provider_upper.lower()}_123"
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)
    return conn

@router.delete("/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connection(
    connection_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    stmt = select(OAuthConnection).where(OAuthConnection.id == connection_id)
    conn = (await db.execute(stmt)).scalar_one_or_none()
    if conn:
        await db.delete(conn)
        await db.commit()
