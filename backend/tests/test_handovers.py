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
