import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_admin_login_success(client: AsyncClient, admin_user):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "test_admin@continuum.io", "password": "AdminTest2026!"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_admin_login_wrong_password(client: AsyncClient, admin_user):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "test_admin@continuum.io", "password": "WrongPassword!"}
    )
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHORIZED"

@pytest.mark.asyncio
async def test_get_me(client: AsyncClient, auth_headers):
    resp = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "test_admin@continuum.io"

@pytest.mark.asyncio
async def test_admin_registration_success(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Sarah Connor",
            "email": "sarah.connor@continuum.io",
            "password": "Password123!",
            "confirm_password": "Password123!"
        }
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["admin"]["email"] == "sarah.connor@continuum.io"
    assert data["admin"]["name"] == "Sarah Connor"
    assert "access_token" in data

@pytest.mark.asyncio
async def test_admin_registration_duplicate_email(client: AsyncClient, admin_user):
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Another Admin",
            "email": "test_admin@continuum.io",
            "password": "Password123!",
            "confirm_password": "Password123!"
        }
    )
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "RESOURCE_CONFLICT"

@pytest.mark.asyncio
async def test_admin_registration_password_mismatch(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Mismatched Password Admin",
            "email": "mismatch@continuum.io",
            "password": "Password123!",
            "confirm_password": "DifferentPassword!"
        }
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "BAD_REQUEST"

@pytest.mark.asyncio
async def test_admin_registration_restricted_mode(client: AsyncClient, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "ADMIN_REGISTRATION_MODE", "restricted")
    monkeypatch.setattr(settings, "REGISTRATION_INVITE_CODE", "SECRET-INVITE-2026")

    # Missing invite code -> 403
    resp_no_invite = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Restricted Admin",
            "email": "restricted@continuum.io",
            "password": "Password123!",
            "confirm_password": "Password123!"
        }
    )
    assert resp_no_invite.status_code == 403
    assert resp_no_invite.json()["error"]["code"] == "FORBIDDEN"

    # With valid invite code -> 201
    resp_with_invite = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Restricted Admin",
            "email": "restricted@continuum.io",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "invite_code": "SECRET-INVITE-2026"
        }
    )
    assert resp_with_invite.status_code == 201

