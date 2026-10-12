import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_semantic_knowledge_search(client: AsyncClient, auth_headers):
    resp = await client.post(
        "/api/v1/knowledge/search",
        json={"query": "Who manages the payment gateway architecture?"},
        headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["query"] == "Who manages the payment gateway architecture?"
    assert "results" in data
    assert "llm_explanation" in data
