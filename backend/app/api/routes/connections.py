import uuid
from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.schemas.connection import ConnectionAuthorizeResponse, ConnectionOut
from app.db.models.all_models import OAuthConnection, Admin
from app.api.dependencies import get_current_admin
from app.core.config import settings
from app.core.security import encrypt_token

router = APIRouter(prefix="/connections", tags=["Connections"])

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
    
    # Store connection record with encrypted token placeholder
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
