import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_risk_overview(client: AsyncClient, auth_headers):
    resp = await client.get("/api/v1/risk/overview", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "overall_risk_level" in data
    assert "critical_projects_count" in data
    assert "average_bus_factor" in data
