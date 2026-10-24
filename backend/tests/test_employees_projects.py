"""
Tests for Edit Employee, Delete Employee, Edit Project, Delete Project.
"""
import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# Helper: create an employee and return its ID
# ---------------------------------------------------------------------------

async def _create_employee(client: AsyncClient, headers: dict, suffix: str = "") -> str:
    resp = await client.post(
        "/api/v1/employees",
        json={
            "name": f"Test Employee{suffix}",
            "email": f"test.employee{suffix}@company.com",
            "role": "Engineer",
            "team": "Backend",
            "status": "ACTIVE",
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def _create_project(client: AsyncClient, headers: dict, suffix: str = "") -> str:
    resp = await client.post(
        "/api/v1/projects",
        json={"name": f"Test Project{suffix}", "description": "Initial description", "status": "ACTIVE"},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


# ===========================================================================
# Edit Employee (PATCH /employees/{id})
# ===========================================================================

@pytest.mark.asyncio
async def test_edit_employee_requires_auth(client: AsyncClient, auth_headers):
    emp_id = await _create_employee(client, auth_headers, "-ea1")
    # Call without auth headers
    resp = await client.patch(f"/api/v1/employees/{emp_id}", json={"name": "Hacker"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_edit_employee_updates_fields(client: AsyncClient, auth_headers):
    emp_id = await _create_employee(client, auth_headers, "-eu1")
    resp = await client.patch(
        f"/api/v1/employees/{emp_id}",
        json={"name": "Updated Name", "role": "Senior Engineer", "team": "Platform", "status": "LEAVING"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Updated Name"
    assert data["role"] == "Senior Engineer"
    assert data["team"] == "Platform"
    assert data["status"] == "LEAVING"


@pytest.mark.asyncio
async def test_edit_employee_partial_update(client: AsyncClient, auth_headers):
    """Only the supplied fields must change; others stay the same."""
    emp_id = await _create_employee(client, auth_headers, "-ep1")
    resp = await client.patch(
        f"/api/v1/employees/{emp_id}",
        json={"role": "Lead Engineer"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "Lead Engineer"
    # name unchanged
    assert data["name"] == "Test Employee-ep1"


@pytest.mark.asyncio
async def test_edit_employee_not_found(client: AsyncClient, auth_headers):
    resp = await client.patch(
        "/api/v1/employees/nonexistent-id",
        json={"name": "Ghost"},
        headers=auth_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_edit_employee_duplicate_email_rejected(client: AsyncClient, auth_headers):
    """Changing an employee's email to one already owned by another employee must 409."""
    emp1_id = await _create_employee(client, auth_headers, "-ede1")
    emp2_id = await _create_employee(client, auth_headers, "-ede2")

    # Fetch emp1's email
    emp1_resp = await client.get(f"/api/v1/employees/{emp1_id}", headers=auth_headers)
    emp1_email = emp1_resp.json()["email"]

    # Try to update emp2's email to emp1's email
    resp = await client.patch(
        f"/api/v1/employees/{emp2_id}",
        json={"email": emp1_email},
        headers=auth_headers,
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_edit_employee_same_email_ok(client: AsyncClient, auth_headers):
    """PATCH with the employee's own email must succeed (no false conflict)."""
    emp_id = await _create_employee(client, auth_headers, "-ese1")
    emp_resp = await client.get(f"/api/v1/employees/{emp_id}", headers=auth_headers)
    own_email = emp_resp.json()["email"]

    resp = await client.patch(
        f"/api/v1/employees/{emp_id}",
        json={"email": own_email, "role": "Unchanged check"},
        headers=auth_headers,
    )
    assert resp.status_code == 200


# ===========================================================================
# Delete Employee (DELETE /employees/{id})
# ===========================================================================

@pytest.mark.asyncio
async def test_delete_employee_requires_auth(client: AsyncClient, auth_headers):
    emp_id = await _create_employee(client, auth_headers, "-da1")
    resp = await client.delete(f"/api/v1/employees/{emp_id}")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_delete_employee_success(client: AsyncClient, auth_headers):
    emp_id = await _create_employee(client, auth_headers, "-ds1")
    resp = await client.delete(f"/api/v1/employees/{emp_id}", headers=auth_headers)
    assert resp.status_code == 204

    # Verify it's gone
    get_resp = await client.get(f"/api/v1/employees/{emp_id}", headers=auth_headers)
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_nonexistent_employee(client: AsyncClient, auth_headers):
    resp = await client.delete("/api/v1/employees/does-not-exist", headers=auth_headers)
    assert resp.status_code == 404


# ===========================================================================
# Edit Project (PATCH /projects/{id})
# ===========================================================================

@pytest.mark.asyncio
async def test_edit_project_requires_auth(client: AsyncClient, auth_headers):
    proj_id = await _create_project(client, auth_headers, "-pa1")
    resp = await client.patch(f"/api/v1/projects/{proj_id}", json={"name": "Hacked"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_edit_project_updates_fields(client: AsyncClient, auth_headers):
    proj_id = await _create_project(client, auth_headers, "-pu1")
    resp = await client.patch(
        f"/api/v1/projects/{proj_id}",
        json={"name": "Renamed Project", "description": "New description", "status": "COMPLETED"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Renamed Project"
    assert data["description"] == "New description"
    assert data["status"] == "COMPLETED"


@pytest.mark.asyncio
async def test_edit_project_partial_update(client: AsyncClient, auth_headers):
    proj_id = await _create_project(client, auth_headers, "-pp1")
    resp = await client.patch(
        f"/api/v1/projects/{proj_id}",
        json={"status": "ARCHIVED"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ARCHIVED"
    assert data["name"] == "Test Project-pp1"


@pytest.mark.asyncio
async def test_edit_project_not_found(client: AsyncClient, auth_headers):
    resp = await client.patch(
        "/api/v1/projects/nonexistent-id",
        json={"name": "Ghost"},
        headers=auth_headers,
    )
    assert resp.status_code == 404


# ===========================================================================
# Delete Project (DELETE /projects/{id})
# ===========================================================================

@pytest.mark.asyncio
async def test_delete_project_requires_auth(client: AsyncClient, auth_headers):
    proj_id = await _create_project(client, auth_headers, "-dpa1")
    resp = await client.delete(f"/api/v1/projects/{proj_id}")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_delete_project_success(client: AsyncClient, auth_headers):
    proj_id = await _create_project(client, auth_headers, "-dps1")
    resp = await client.delete(f"/api/v1/projects/{proj_id}", headers=auth_headers)
    assert resp.status_code == 204

    get_resp = await client.get(f"/api/v1/projects/{proj_id}", headers=auth_headers)
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_nonexistent_project(client: AsyncClient, auth_headers):
    resp = await client.delete("/api/v1/projects/does-not-exist", headers=auth_headers)
    assert resp.status_code == 404


# ===========================================================================
# Regression: existing tests must still pass (smoke)
# ===========================================================================

@pytest.mark.asyncio
async def test_employee_list_and_create_still_work(client: AsyncClient, auth_headers):
    """Ensure the existing create + list flow is not broken by our changes."""
    emp_id = await _create_employee(client, auth_headers, "-reg1")
    list_resp = await client.get("/api/v1/employees", headers=auth_headers)
    assert list_resp.status_code == 200
    ids = [e["id"] for e in list_resp.json()]
    assert emp_id in ids


@pytest.mark.asyncio
async def test_project_list_and_create_still_work(client: AsyncClient, auth_headers):
    proj_id = await _create_project(client, auth_headers, "-reg2")
    list_resp = await client.get("/api/v1/projects", headers=auth_headers)
    assert list_resp.status_code == 200
    ids = [p["id"] for p in list_resp.json()]
    assert proj_id in ids
