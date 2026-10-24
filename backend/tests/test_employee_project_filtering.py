"""
Tests for employee-project assignment filtering logic.

These tests verify the data relationships that drive the frontend
Primary Project dropdown filtering: an employee must only expose
their own assigned projects, not the full org list.
"""
import pytest
from httpx import AsyncClient


async def _create_employee(client, headers, suffix=""):
    resp = await client.post(
        "/api/v1/employees",
        json={
            "name": f"Filter Employee{suffix}",
            "email": f"filter.emp{suffix}@company.com",
            "role": "Engineer",
            "team": "Backend",
            "status": "ACTIVE",
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def _create_project(client, headers, suffix=""):
    resp = await client.post(
        "/api/v1/projects",
        json={"name": f"Filter Project{suffix}", "description": "Test project"},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def _assign_projects(client, headers, emp_id, project_ids):
    resp = await client.patch(
        f"/api/v1/employees/{emp_id}",
        json={"project_ids": project_ids},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text


async def _get_employee_projects(client, headers, emp_id):
    resp = await client.get(f"/api/v1/employees/{emp_id}", headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json().get("projects", [])


@pytest.mark.asyncio
async def test_employee_with_one_project(client: AsyncClient, auth_headers):
    emp_id = await _create_employee(client, auth_headers, "-f1")
    proj_id = await _create_project(client, auth_headers, "-f1")
    await _assign_projects(client, auth_headers, emp_id, [proj_id])
    projects = await _get_employee_projects(client, auth_headers, emp_id)
    assert len(projects) == 1
    assert projects[0]["id"] == proj_id


@pytest.mark.asyncio
async def test_employee_with_two_projects(client: AsyncClient, auth_headers):
    emp_id = await _create_employee(client, auth_headers, "-f2")
    proj1 = await _create_project(client, auth_headers, "-f2a")
    proj2 = await _create_project(client, auth_headers, "-f2b")
    await _assign_projects(client, auth_headers, emp_id, [proj1, proj2])
    projects = await _get_employee_projects(client, auth_headers, emp_id)
    returned_ids = {p["id"] for p in projects}
    assert len(projects) == 2
    assert returned_ids == {proj1, proj2}


@pytest.mark.asyncio
async def test_employee_with_five_projects(client: AsyncClient, auth_headers):
    emp_id = await _create_employee(client, auth_headers, "-f5")
    proj_ids = []
    for i in range(5):
        pid = await _create_project(client, auth_headers, f"-f5-{i}")
        proj_ids.append(pid)
    await _assign_projects(client, auth_headers, emp_id, proj_ids)
    projects = await _get_employee_projects(client, auth_headers, emp_id)
    returned_ids = {p["id"] for p in projects}
    assert len(projects) == 5
    assert returned_ids == set(proj_ids)


@pytest.mark.asyncio
async def test_other_employees_projects_excluded(client: AsyncClient, auth_headers):
    emp_a = await _create_employee(client, auth_headers, "-fa")
    emp_b = await _create_employee(client, auth_headers, "-fb")
    proj_a = await _create_project(client, auth_headers, "-fa-prj")
    proj_b = await _create_project(client, auth_headers, "-fb-prj")
    await _assign_projects(client, auth_headers, emp_a, [proj_a])
    await _assign_projects(client, auth_headers, emp_b, [proj_b])
    ids_a = {p["id"] for p in await _get_employee_projects(client, auth_headers, emp_a)}
    ids_b = {p["id"] for p in await _get_employee_projects(client, auth_headers, emp_b)}
    assert proj_b not in ids_a, "Employee A must not see Employee B project"
    assert proj_a not in ids_b, "Employee B must not see Employee A project"


@pytest.mark.asyncio
async def test_employee_with_no_projects(client: AsyncClient, auth_headers):
    emp_id = await _create_employee(client, auth_headers, "-f0")
    projects = await _get_employee_projects(client, auth_headers, emp_id)
    assert projects == []


@pytest.mark.asyncio
async def test_changing_employee_shows_different_projects(client: AsyncClient, auth_headers):
    emp1 = await _create_employee(client, auth_headers, "-chg1")
    emp2 = await _create_employee(client, auth_headers, "-chg2")
    p1 = await _create_project(client, auth_headers, "-chg1p")
    p2 = await _create_project(client, auth_headers, "-chg2p")
    await _assign_projects(client, auth_headers, emp1, [p1])
    await _assign_projects(client, auth_headers, emp2, [p2])
    projects_emp1 = {p["id"] for p in await _get_employee_projects(client, auth_headers, emp1)}
    projects_emp2 = {p["id"] for p in await _get_employee_projects(client, auth_headers, emp2)}
    assert projects_emp1 != projects_emp2
    assert p1 in projects_emp1 and p2 not in projects_emp1
    assert p2 in projects_emp2 and p1 not in projects_emp2


@pytest.mark.asyncio
async def test_editing_employee_preserves_project_assignments(client: AsyncClient, auth_headers):
    emp_id = await _create_employee(client, auth_headers, "-pres")
    proj_id = await _create_project(client, auth_headers, "-pres-p")
    await _assign_projects(client, auth_headers, emp_id, [proj_id])
    # Edit unrelated fields only - no project_ids in payload
    resp = await client.patch(
        f"/api/v1/employees/{emp_id}",
        json={"name": "Updated Preserve Name", "role": "Senior Engineer"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Preserve Name"
    projects = await _get_employee_projects(client, auth_headers, emp_id)
    assert proj_id in {p["id"] for p in projects}


@pytest.mark.asyncio
async def test_updating_projects_does_not_affect_other_employee(client: AsyncClient, auth_headers):
    emp1 = await _create_employee(client, auth_headers, "-iso1")
    emp2 = await _create_employee(client, auth_headers, "-iso2")
    shared_proj = await _create_project(client, auth_headers, "-iso-shared")
    unique_proj = await _create_project(client, auth_headers, "-iso-unique")
    await _assign_projects(client, auth_headers, emp1, [shared_proj, unique_proj])
    await _assign_projects(client, auth_headers, emp2, [shared_proj])
    # Remove unique_proj from emp1 only
    await _assign_projects(client, auth_headers, emp1, [shared_proj])
    emp1_ids = {p["id"] for p in await _get_employee_projects(client, auth_headers, emp1)}
    emp2_ids = {p["id"] for p in await _get_employee_projects(client, auth_headers, emp2)}
    assert emp1_ids == {shared_proj}
    assert shared_proj in emp2_ids


@pytest.mark.asyncio
async def test_employee_response_includes_project_ids(client: AsyncClient, auth_headers):
    emp_id = await _create_employee(client, auth_headers, "-id-check")
    proj_id = await _create_project(client, auth_headers, "-id-check-p")
    await _assign_projects(client, auth_headers, emp_id, [proj_id])
    resp = await client.get(f"/api/v1/employees/{emp_id}", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    projects = data.get("projects", [])
    assert len(projects) == 1
    proj = projects[0]
    assert "id" in proj, "Project must have id field for frontend filtering"
    assert proj["id"] == proj_id
    assert "name" in proj
