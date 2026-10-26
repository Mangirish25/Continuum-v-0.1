import pytest
from httpx import AsyncClient
from app.db.models.all_models import Admin, Employee, Project

@pytest.mark.asyncio
async def test_sources_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/v1/sources")
    assert resp.status_code == 401

@pytest.mark.asyncio
async def test_create_and_get_github_source(client: AsyncClient, auth_headers: dict, db_session):
    emp = Employee(name="Jane Engineer", email="jane@acme.com", role="Senior Developer", team="Engineering")
    db_session.add(emp)
    proj = Project(name="Core API", description="Core API service")
    db_session.add(proj)
    await db_session.commit()
    await db_session.refresh(emp)
    await db_session.refresh(proj)

    payload = {
        "source_type": "github",
        "name": "core-api-repo",
        "url": "https://github.com/acme/core-api",
        "employee_id": emp.id,
        "project_id": proj.id
    }
    resp = await client.post("/api/v1/sources", json=payload, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["source_type"] == "github"
    assert data["name"] == "core-api-repo"
    assert data["url"] == "https://github.com/acme/core-api"
    assert data["status"] == "READY"
    assert data["employee_name"] == "Jane Engineer"
    assert data["project_name"] == "Core API"
    source_id = data["id"]

    # Verify GET lists the source
    get_resp = await client.get("/api/v1/sources", headers=auth_headers)
    assert get_resp.status_code == 200
    items = get_resp.json()
    assert any(s["id"] == source_id for s in items)

    # Verify duplicate source rejection
    dup_resp = await client.post("/api/v1/sources", json=payload, headers=auth_headers)
    assert dup_resp.status_code == 409
    assert dup_resp.json()["error"]["code"] == "RESOURCE_CONFLICT"

@pytest.mark.asyncio
async def test_create_invalid_github_url(client: AsyncClient, auth_headers: dict):
    payload = {
        "source_type": "github",
        "name": "invalid-repo",
        "url": "https://gitlab.com/not/github",
    }
    resp = await client.post("/api/v1/sources", json=payload, headers=auth_headers)
    assert resp.status_code == 400
    assert "Invalid GitHub URL" in resp.json()["error"]["message"]

@pytest.mark.asyncio
async def test_drive_requires_an_explicit_local_path_and_employee(client: AsyncClient, auth_headers: dict):
    payload = {
        "source_type": "googledrive",
        "name": "Engineering Specs",
        "external_resource_id": "folder_spec_123"
    }
    resp = await client.post("/api/v1/sources", json=payload, headers=auth_headers)
    assert resp.status_code == 400
    assert "local_path" in resp.text

@pytest.mark.asyncio
async def test_notion_requires_an_explicit_local_path_and_jira_is_unsupported(client: AsyncClient, auth_headers: dict):
    notion_payload = {
        "source_type": "notion",
        "name": "Architecture RFC",
        "external_resource_id": "page_rfc_789"
    }
    notion_resp = await client.post("/api/v1/sources", json=notion_payload, headers=auth_headers)
    assert notion_resp.status_code == 400
    assert "local_path" in notion_resp.text

    # Jira
    jira_payload = {
        "source_type": "jira",
        "name": "Payments Board",
        "external_resource_id": "PAY"
    }
    jira_resp = await client.post("/api/v1/sources", json=jira_payload, headers=auth_headers)
    assert jira_resp.status_code == 400
    assert "Unsupported source type" in jira_resp.text

@pytest.mark.asyncio
async def test_delete_source(client: AsyncClient, auth_headers: dict):
    payload = {
        "source_type": "github",
        "name": "temp-repo",
        "url": "https://github.com/acme/temp-repo",
    }
    create_resp = await client.post("/api/v1/sources", json=payload, headers=auth_headers)
    source_id = create_resp.json()["id"]

    # Soft delete (deactivate)
    del_resp = await client.delete(f"/api/v1/sources/{source_id}", headers=auth_headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "DISABLED"
