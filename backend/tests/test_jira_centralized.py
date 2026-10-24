import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models.all_models import OAuthConnection, EmployeeResource, Employee, Project
from app.core.security import decrypt_token

@pytest.mark.asyncio
async def test_jira_endpoints_require_admin_authentication(client: AsyncClient):
    # Unauthenticated calls must return 401
    resp_get = await client.get("/api/v1/connections/jira")
    assert resp_get.status_code == 401

    resp_post = await client.post(
        "/api/v1/connections/jira/configure",
        json={
            "workspace_url": "https://continuum.atlassian.net",
            "admin_email": "admin@continuum.io",
            "api_token": "secret_token_123"
        }
    )
    assert resp_post.status_code == 401


@pytest.mark.asyncio
async def test_centralized_jira_workspace_configuration_and_verification(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession
):
    # 1. Initial status when unconfigured
    resp_init = await client.get("/api/v1/connections/jira", headers=auth_headers)
    assert resp_init.status_code == 200
    assert resp_init.json()["connected"] is False
    assert resp_init.json()["status"] == "NOT_CONFIGURED"

    # 2. Admin configures Jira workspace
    config_payload = {
        "workspace_url": "https://continuum.atlassian.net",
        "admin_email": "admin@continuum.io",
        "api_token": "atlassian_api_token_val_9988"
    }
    resp_config = await client.post(
        "/api/v1/connections/jira/configure",
        json=config_payload,
        headers=auth_headers
    )
    assert resp_config.status_code == 200
    data = resp_config.json()
    assert data["connected"] is True
    assert data["verified"] is True
    assert data["workspace_url"] == "https://continuum.atlassian.net"
    assert data["admin_email"] == "admin@continuum.io"
    # Ensure api_token is NEVER returned in response
    assert "atlassian_api_token_val_9988" not in str(data)

    # 3. Verify in DB that access token was encrypted with Fernet
    stmt = select(OAuthConnection).where(OAuthConnection.provider == "JIRA")
    db_conn = (await db_session.execute(stmt)).scalar_one_or_none()
    assert db_conn is not None
    assert db_conn.access_token_encrypted != "atlassian_api_token_val_9988"
    decrypted = decrypt_token(db_conn.access_token_encrypted)
    assert "atlassian_api_token_val_9988" in decrypted

    # 4. Re-verify Jira connection
    resp_verify = await client.post("/api/v1/connections/jira/verify", headers=auth_headers)
    assert resp_verify.status_code == 200
    verify_data = resp_verify.json()
    assert verify_data["verified"] is True
    assert verify_data["status"] == "VERIFIED"

    # 5. List Jira projects
    resp_proj = await client.get("/api/v1/connections/jira/projects", headers=auth_headers)
    assert resp_proj.status_code == 200
    projects = resp_proj.json()
    assert len(projects) > 0
    assert any(p.get("key") == "PAY" for p in projects)


@pytest.mark.asyncio
async def test_jira_resource_registration_and_disconnection_lifecycle(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession
):
    # 1. Setup employee and project
    emp = Employee(
        id="emp_jira_tester",
        name="Tanya Sen",
        email="tanya.sen@company.com",
        role="DevOps Lead",
        team="Infrastructure"
    )
    proj = Project(
        id="proj_jira_infra",
        name="Infrastructure Automation",
        description="INFRA - Infrastructure Automation",
        status="ACTIVE"
    )
    db_session.add_all([emp, proj])
    await db_session.commit()

    # 2. Configure central Jira workspace
    await client.post(
        "/api/v1/connections/jira/configure",
        json={
            "workspace_url": "https://continuum.atlassian.net",
            "admin_email": "admin@continuum.io",
            "api_token": "token_infra_test"
        },
        headers=auth_headers
    )

    # 3. Connect Jira project resource for employee without providing individual credentials
    resp_res = await client.post(
        "/api/v1/resources/jira/map",
        json={
            "employee_id": emp.id,
            "project_id": proj.id,
            "jira_project_key": "INFRA",
            "jira_project_name": "Infrastructure Automation Issues"
        },
        headers=auth_headers
    )
    assert resp_res.status_code == 201
    res_data = resp_res.json()
    assert res_data["provider"] == "JIRA"
    assert res_data["employee_id"] == emp.id
    assert res_data["project_id"] == proj.id
    assert res_data["status"] in ["CONNECTED", "READY", "SYNCING"]

    # 4. Admin disconnects Jira workspace
    resp_disc = await client.delete("/api/v1/connections/jira", headers=auth_headers)
    assert resp_disc.status_code == 200

    # 5. Resource still exists and employee attribution is preserved, but status is now NEEDS_AUTH
    res_stmt = select(EmployeeResource).where(EmployeeResource.id == res_data["id"])
    saved_res = (await db_session.execute(res_stmt)).scalar_one_or_none()
    assert saved_res is not None
    assert saved_res.employee_id == emp.id
    assert saved_res.project_id == proj.id
    assert saved_res.status == "NEEDS_AUTH"
