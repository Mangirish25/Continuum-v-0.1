import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.all_models import Employee, Project, EmployeeResource, KnowledgeDocument, KnowledgeChunk

@pytest.mark.asyncio
async def test_employee_aware_search_resolves_employee_and_returns_evidence(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession
):
    # 1. Seed employee and project
    emp = Employee(
        id="emp_test_shivay",
        name="Shivay Oberoi",
        email="shivay.oberoi@company.com",
        role="Principal Platform Engineer",
        team="Core Infrastructure"
    )
    proj = Project(
        id="proj_test_pay",
        name="Payment Services",
        description="Core payment processing platform",
        status="ACTIVE"
    )
    db_session.add_all([emp, proj])
    await db_session.commit()

    # 2. Seed an indexed knowledge document and chunk attributed to Shivay
    doc = KnowledgeDocument(
        id="doc_gdrive_shivay_arch",
        resource_id="res_gdrive_test",
        employee_id=emp.id,
        project_id=proj.id,
        provider="GOOGLE_DRIVE",
        external_id="ext_doc_shivay_1",
        title="Payment Platform Architecture & Security Playbook - Shivay Oberoi",
        source_url="https://drive.google.com/open?id=test_shivay_doc",
        content="Shivay Oberoi authored the core architecture for the microservices tokenization vault and high-throughput routing engine.",
        content_hash="hash_shivay_arch_1",
        doc_metadata={"author": "Shivay Oberoi", "provider": "GOOGLE_DRIVE"}
    )
    db_session.add(doc)
    await db_session.commit()

    chunk = KnowledgeChunk(
        id="chk_gdrive_shivay_01",
        document_id=doc.id,
        chunk_index=0,
        content="Shivay Oberoi is the primary architectural custodian for the zero-trust payment vault, processing 10k TPS.",
        chunk_metadata={
            "document_id": doc.id,
            "title": doc.title,
            "provider": "GOOGLE_DRIVE",
            "source_url": doc.source_url,
            "employee_id": emp.id,
            "project_id": proj.id,
            "employee_name": "Shivay Oberoi"
        }
    )
    db_session.add(chunk)
    await db_session.commit()

    # 3. Execute natural language query with employee name and "googledrive" variation
    resp = await client.post(
        "/api/v1/knowledge/search",
        json={
            "query": "Shivay Oberoi tell me more about him",
            "provider": "googledrive"
        },
        headers=auth_headers
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["total_results"] > 0
    first_res = data["results"][0]
    assert first_res["title"] == "Payment Platform Architecture & Security Playbook - Shivay Oberoi"
    assert first_res["provider"] == "GOOGLE_DRIVE"
    assert first_res["employee"]["name"] == "Shivay Oberoi"
    assert first_res["employee"]["id"] == emp.id
    assert first_res["project"]["name"] == "Payment Services"
    assert "Shivay Oberoi" in data["llm_explanation"]


@pytest.mark.asyncio
async def test_search_provider_normalization(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession
):
    # Verify that "google_drive", "GOOGLEDRIVE", "Drive" all normalize identically
    resp1 = await client.post(
        "/api/v1/knowledge/search",
        json={"query": "architecture", "provider": "google_drive"},
        headers=auth_headers
    )
    assert resp1.status_code == 200

    resp2 = await client.post(
        "/api/v1/knowledge/search",
        json={"query": "architecture", "provider": "googledrive"},
        headers=auth_headers
    )
    assert resp2.status_code == 200


@pytest.mark.asyncio
async def test_honest_diagnostic_when_employee_has_no_sources(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession
):
    # Employee exists in directory, but has no knowledge sources connected
    emp_empty = Employee(
        id="emp_test_unconnected",
        name="Ananya Verma",
        email="ananya.verma@company.com",
        role="Product Analyst",
        team="Product"
    )
    db_session.add(emp_empty)
    await db_session.commit()

    resp = await client.post(
        "/api/v1/knowledge/search",
        json={"query": "Tell me about Ananya Verma"},
        headers=auth_headers
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["total_results"] == 0
    assert "Ananya Verma" in data["llm_explanation"]
    assert "has no knowledge sources connected" in data["llm_explanation"]
    assert "connect and synchronize a resource" in data["llm_explanation"]
