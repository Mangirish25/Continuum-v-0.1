import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_and_get_project(client: AsyncClient, auth_headers):
    # Create project
    create_resp = await client.post(
        "/api/v1/projects",
        json={
            "name": "Billing Service",
            "description": "Recurring billing engine"
        },
        headers=auth_headers
    )
    assert create_resp.status_code == 201
    p_data = create_resp.json()
    assert p_data["name"] == "Billing Service"
    assert "bus_factor" in p_data

    # List projects
    list_resp = await client.get("/api/v1/projects", headers=auth_headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1
