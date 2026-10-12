import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_and_get_employee(client: AsyncClient, auth_headers):
    # Create employee
    create_resp = await client.post(
        "/api/v1/employees",
        json={
            "name": "Jane Doe",
            "email": "jane.doe@company.com",
            "role": "Staff Engineer",
            "team": "Core Platform",
            "skills": ["Go", "Kubernetes"]
        },
        headers=auth_headers
    )
    assert create_resp.status_code == 201
    emp_data = create_resp.json()
    assert emp_data["name"] == "Jane Doe"
    emp_id = emp_data["id"]

    # Get employee
    get_resp = await client.get(f"/api/v1/employees/{emp_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["email"] == "jane.doe@company.com"

@pytest.mark.asyncio
async def test_list_employees(client: AsyncClient, auth_headers):
    resp = await client.get("/api/v1/employees", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
