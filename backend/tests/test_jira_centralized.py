import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_external_oauth_connection_routes_are_not_registered(client: AsyncClient, auth_headers: dict):
    for path in (
        "/api/v1/connections/jira",
        "/api/v1/connections/google/authorize",
        "/api/v1/connections/notion/authorize",
        "/api/v1/resources/gdrive/folders",
        "/api/v1/resources/notion/pages",
        "/api/v1/resources/jira/projects",
    ):
        response = await client.get(path, headers=auth_headers)
        assert response.status_code == 404, (path, response.status_code, response.text)
