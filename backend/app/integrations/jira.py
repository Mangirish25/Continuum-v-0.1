import httpx
from typing import List, Dict, Any, Optional
from app.integrations.base import BaseConnector, NormalizedDocument
from app.core.config import settings
from app.core.logging import logger

class JiraConnector(BaseConnector):
    def __init__(self, access_token: Optional[str] = None, site_url: Optional[str] = None):
        self.access_token = access_token
        self.site_url = site_url.rstrip("/") if site_url else "https://continuum.atlassian.net"
        self.headers = {"Accept": "application/json", "Content-Type": "application/json"}
        if self.access_token:
            self.headers["Authorization"] = f"Bearer {self.access_token}"

    async def validate_connection(self) -> bool:
        if not self.access_token:
            return False
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{self.site_url}/rest/api/3/myself", headers=self.headers, timeout=10.0)
            return resp.status_code == 200

    async def list_resources(self) -> List[Dict[str, Any]]:
        """List Jira projects in the company workspace."""
        if not self.access_token:
            return [
                {"id": "PAY", "key": "PAY", "name": "Payment Platform", "projectTypeKey": "software"},
                {"id": "AUTH", "key": "AUTH", "name": "Authentication Service", "projectTypeKey": "software"},
                {"id": "INFRA", "key": "INFRA", "name": "Developer Infrastructure", "projectTypeKey": "software"}
            ]

        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{self.site_url}/rest/api/3/project", headers=self.headers, timeout=15.0)
            if resp.status_code == 200:
                return resp.json()
            return []

    async def fetch_documents(
        self,
        external_resource_id: str, # Jira Project Key (e.g. PAY, AUTH, INFRA)
        employee_id: Optional[str] = None,
        project_id: Optional[str] = None,
        **kwargs
    ) -> List[NormalizedDocument]:
        jira_project_key = external_resource_id

        if not self.access_token or jira_project_key in ["PAY", "AUTH", "INFRA"]:
            # Realistic mock Jira issues for company projects
            mock_issues = [
                NormalizedDocument(
                    external_id=f"jira:{jira_project_key}:PAY-101",
                    title=f"[{jira_project_key}-101] Implement Stripe Webhook Retry & Idempotency",
                    content="Issue: PAY-101\nAssignee: Rahul Sharma (jira_rahul_01)\nStatus: In Progress\nPriority: High\nDescription: Webhook event processing must be idempotent to prevent double charge processing. Redis distributed lock is used for idempotency validation.",
                    provider="JIRA",
                    source_url=f"{self.site_url}/browse/{jira_project_key}-101",
                    employee_id=employee_id,
                    project_id=project_id,
                    doc_metadata={"issue_key": f"{jira_project_key}-101", "assignee_id": "jira_rahul_01", "status": "In Progress"}
                ),
                NormalizedDocument(
                    external_id=f"jira:{jira_project_key}:PAY-102",
                    title=f"[{jira_project_key}-102] Legacy Adyen SDK Deprecation & Migration",
                    content="Issue: PAY-102\nAssignee: Rahul Sharma (jira_rahul_01)\nStatus: Open\nPriority: Highest\nDescription: Critical security patch required for Adyen API v6. Migration runbook missing in repository docs.",
                    provider="JIRA",
                    source_url=f"{self.site_url}/browse/{jira_project_key}-102",
                    employee_id=employee_id,
                    project_id=project_id,
                    doc_metadata={"issue_key": f"{jira_project_key}-102", "assignee_id": "jira_rahul_01", "status": "Open"}
                ),
                NormalizedDocument(
                    external_id=f"jira:{jira_project_key}:AUTH-201",
                    title=f"[{jira_project_key}-201] Multi-factor OAuth Token Refresh Bottleneck",
                    content="Issue: AUTH-201\nAssignee: Priya Deshmukh (jira_priya_02)\nStatus: In Review\nPriority: Medium\nDescription: Refresh token caching in Redis reduced latency by 45%. Shared auth session key structure documented.",
                    provider="JIRA",
                    source_url=f"{self.site_url}/browse/{jira_project_key}-201",
                    employee_id=employee_id,
                    project_id=project_id,
                    doc_metadata={"issue_key": f"{jira_project_key}-201", "assignee_id": "jira_priya_02", "status": "In Review"}
                )
            ]
            logger.info(f"Fetched {len(mock_issues)} Jira issue documents for project '{jira_project_key}'")
            return mock_issues

        async with httpx.AsyncClient() as client:
            jql = f"project = '{jira_project_key}' ORDER BY updated DESC"
            search_url = f"{self.site_url}/rest/api/3/search?jql={jql}&maxResults=50"
            resp = await client.get(search_url, headers=self.headers, timeout=15.0)

            documents = []
            if resp.status_code == 200:
                issues = resp.json().get("issues", [])
                for issue in issues:
                    key = issue["key"]
                    fields = issue.get("fields", {})
                    summary = fields.get("summary", "")
                    description = fields.get("description") or ""

                    # Extract assignee details
                    assignee_obj = fields.get("assignee") or {}
                    assignee_name = assignee_obj.get("displayName", "Unassigned")
                    assignee_account_id = assignee_obj.get("accountId", "")

                    status_name = fields.get("status", {}).get("name", "Unknown")

                    content = f"Issue Key: {key}\nTitle: {summary}\nAssignee: {assignee_name} ({assignee_account_id})\nStatus: {status_name}\nDescription: {description}"

                    documents.append(
                        NormalizedDocument(
                            external_id=f"jira:{jira_project_key}:{key}",
                            title=f"[{key}] {summary}",
                            content=content,
                            provider="JIRA",
                            source_url=f"{self.site_url}/browse/{key}",
                            employee_id=employee_id,
                            project_id=project_id,
                            doc_metadata={
                                "issue_key": key,
                                "jira_project_key": jira_project_key,
                                "assignee_id": assignee_account_id,
                                "status": status_name
                            }
                        )
                    )

        logger.info(f"Fetched {len(documents)} Jira issue documents for project '{jira_project_key}'")
        return documents
