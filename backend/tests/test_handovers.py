import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_handover_workflow(client: AsyncClient, auth_headers):
    # 1. Create an employee
    emp_resp = await client.post(
        "/api/v1/employees",
        json={"name": "Alice Smith", "email": "alice.smith@company.com", "role": "Senior Engineer", "team": "Platform", "status": "LEAVING"},
        headers=auth_headers
    )
    assert emp_resp.status_code == 201
    emp_id = emp_resp.json()["id"]

    # 2. Initiate Handover Generation
    ho_resp = await client.post(
        "/api/v1/handovers",
        json={"employee_id": emp_id, "recipient_email": "manager@company.com"},
        headers=auth_headers
    )
    assert ho_resp.status_code == 201
    ho_data = ho_resp.json()
    assert ho_data["status"] == "READY_FOR_REVIEW"
    assert ho_data["knowledge_package"] is not None
    ho_id = ho_data["id"]

    # 3. Confirm and Send Email Report
    send_resp = await client.post(
        f"/api/v1/handovers/{ho_id}/send",
        json={"recipient_email": "manager@company.com"},
        headers=auth_headers
    )
    assert send_resp.status_code == 200
    assert send_resp.json()["status"] == "SENT"
    assert send_resp.json()["sent_at"] is not None


# --------------------------------------------------------------------------- #
# Take Back Handover (reversal) tests                                         #
# --------------------------------------------------------------------------- #

@pytest.mark.asyncio
async def test_reverse_handover_requires_auth(client: AsyncClient, auth_headers):
    """Unauthenticated request to /reverse must be rejected with 401."""
    # Create employee + handover first
    emp_resp = await client.post(
        "/api/v1/employees",
        json={"name": "Bob Jones", "email": "bob.jones@company.com", "role": "Engineer", "team": "Platform", "status": "LEAVING"},
        headers=auth_headers
    )
    emp_id = emp_resp.json()["id"]

    ho_resp = await client.post(
        "/api/v1/handovers",
        json={"employee_id": emp_id},
        headers=auth_headers
    )
    ho_id = ho_resp.json()["id"]

    # No auth header
    rev_resp = await client.post(
        f"/api/v1/handovers/{ho_id}/reverse",
        json={"reason": "Taking back without auth"},
    )
    assert rev_resp.status_code == 401


@pytest.mark.asyncio
async def test_reverse_handover_empty_reason_rejected(client: AsyncClient, auth_headers):
    """Empty reason string must be rejected with 422 by Pydantic schema."""
    emp_resp = await client.post(
        "/api/v1/employees",
        json={"name": "Carol White", "email": "carol.white@company.com", "role": "Engineer", "team": "Infra", "status": "LEAVING"},
        headers=auth_headers
    )
    emp_id = emp_resp.json()["id"]

    ho_resp = await client.post(
        "/api/v1/handovers",
        json={"employee_id": emp_id},
        headers=auth_headers
    )
    ho_id = ho_resp.json()["id"]

    rev_resp = await client.post(
        f"/api/v1/handovers/{ho_id}/reverse",
        json={"reason": "   "},  # whitespace-only — Pydantic min_length=1 may not catch post-strip
        headers=auth_headers,
    )
    # Either 422 (Pydantic) or 400 (service-level) depending on whitespace handling
    assert rev_resp.status_code in (400, 422)


@pytest.mark.asyncio
async def test_reverse_nonexistent_handover(client: AsyncClient, auth_headers):
    """Reversing a non-existent ID must return 404."""
    rev_resp = await client.post(
        "/api/v1/handovers/nonexistent-id-9999/reverse",
        json={"reason": "Test reversal"},
        headers=auth_headers,
    )
    assert rev_resp.status_code == 404


@pytest.mark.asyncio
async def test_reverse_ready_for_review_handover(client: AsyncClient, auth_headers):
    """A READY_FOR_REVIEW handover must be reversible; response must carry REVERSED status."""
    # Create employee
    emp_resp = await client.post(
        "/api/v1/employees",
        json={"name": "Dave Brown", "email": "dave.brown@company.com", "role": "Analyst", "team": "Data", "status": "LEAVING"},
        headers=auth_headers
    )
    assert emp_resp.status_code == 201
    emp_id = emp_resp.json()["id"]

    # Create handover (will land in READY_FOR_REVIEW)
    ho_resp = await client.post(
        "/api/v1/handovers",
        json={"employee_id": emp_id},
        headers=auth_headers
    )
    assert ho_resp.status_code == 201
    ho_id = ho_resp.json()["id"]
    assert ho_resp.json()["status"] == "READY_FOR_REVIEW"

    # Reverse it
    rev_resp = await client.post(
        f"/api/v1/handovers/{ho_id}/reverse",
        json={"reason": "Employee decided to stay"},
        headers=auth_headers,
    )
    assert rev_resp.status_code == 200
    rev_data = rev_resp.json()
    assert rev_data["status"] == "REVERSED"
    assert rev_data["reversal_reason"] == "Employee decided to stay"
    assert rev_data["reversed_at"] is not None
    assert rev_data["id"] == ho_id


@pytest.mark.asyncio
async def test_reverse_sent_handover(client: AsyncClient, auth_headers):
    """A SENT handover must also be reversible."""
    emp_resp = await client.post(
        "/api/v1/employees",
        json={"name": "Eve Green", "email": "eve.green@company.com", "role": "Designer", "team": "Product", "status": "LEAVING"},
        headers=auth_headers
    )
    emp_id = emp_resp.json()["id"]

    ho_resp = await client.post(
        "/api/v1/handovers",
        json={"employee_id": emp_id, "recipient_email": "pm@company.com"},
        headers=auth_headers
    )
    ho_id = ho_resp.json()["id"]

    # Send the handover first
    await client.post(
        f"/api/v1/handovers/{ho_id}/send",
        json={"recipient_email": "pm@company.com"},
        headers=auth_headers,
    )

    rev_resp = await client.post(
        f"/api/v1/handovers/{ho_id}/reverse",
        json={"reason": "Succession plan changed"},
        headers=auth_headers,
    )
    assert rev_resp.status_code == 200
    assert rev_resp.json()["status"] == "REVERSED"


@pytest.mark.asyncio
async def test_reverse_already_reversed_handover_rejected(client: AsyncClient, auth_headers):
    """Attempting to reverse a REVERSED handover must return 409 Conflict."""
    emp_resp = await client.post(
        "/api/v1/employees",
        json={"name": "Frank Lee", "email": "frank.lee@company.com", "role": "Manager", "team": "Ops", "status": "LEAVING"},
        headers=auth_headers
    )
    emp_id = emp_resp.json()["id"]

    ho_resp = await client.post(
        "/api/v1/handovers",
        json={"employee_id": emp_id},
        headers=auth_headers
    )
    ho_id = ho_resp.json()["id"]

    # First reversal — should succeed
    first = await client.post(
        f"/api/v1/handovers/{ho_id}/reverse",
        json={"reason": "Reason one"},
        headers=auth_headers,
    )
    assert first.status_code == 200

    # Second reversal — should be rejected
    second = await client.post(
        f"/api/v1/handovers/{ho_id}/reverse",
        json={"reason": "Reason two"},
        headers=auth_headers,
    )
    assert second.status_code == 409


@pytest.mark.asyncio
async def test_reverse_draft_handover_rejected(client: AsyncClient, auth_headers, db_session):
    """A DRAFT handover (not yet ready) must be rejected with 400."""
    from app.db.models.all_models import Handover, Employee
    from sqlalchemy import select

    # Manually create a DRAFT handover directly in DB
    emp_resp = await client.post(
        "/api/v1/employees",
        json={"name": "Grace Kim", "email": "grace.kim@company.com", "role": "QA", "team": "Testing", "status": "LEAVING"},
        headers=auth_headers
    )
    emp_id = emp_resp.json()["id"]

    draft_handover = Handover(employee_id=emp_id, status="DRAFT")
    db_session.add(draft_handover)
    await db_session.commit()
    await db_session.refresh(draft_handover)
    ho_id = draft_handover.id

    rev_resp = await client.post(
        f"/api/v1/handovers/{ho_id}/reverse",
        json={"reason": "Trying to reverse a draft"},
        headers=auth_headers,
    )
    assert rev_resp.status_code == 400
