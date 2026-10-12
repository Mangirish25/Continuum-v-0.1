import httpx
from typing import List, Dict, Any, Optional
from app.integrations.base import BaseConnector, NormalizedDocument
from app.core.config import settings
from app.core.logging import logger

class NotionConnector(BaseConnector):
    def __init__(self, access_token: Optional[str] = None):
        self.access_token = access_token
        self.headers = {
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
        }
        if self.access_token:
            self.headers["Authorization"] = f"Bearer {self.access_token}"

    async def validate_connection(self) -> bool:
        if not self.access_token:
            return False
        async with httpx.AsyncClient() as client:
            resp = await client.get("https://api.notion.com/v1/users/me", headers=self.headers, timeout=10.0)
            return resp.status_code == 200

    async def list_resources(self) -> List[Dict[str, Any]]:
        """List shared Notion pages/resources."""
        if not self.access_token:
            return [
                {"id": "notion_page_infra", "title": "Developer Infrastructure Runbook & Secrets Management", "object": "page"},
                {"id": "notion_page_analytics", "title": "Analytics Pipeline Data Schema & ETL Jobs", "object": "page"},
                {"id": "notion_page_auth", "title": "Auth Service OAuth & JWT Token Migration Guide", "object": "page"}
            ]

        async with httpx.AsyncClient() as client:
            resp = await client.post("https://api.notion.com/v1/search", json={"filter": {"value": "page", "property": "object"}}, headers=self.headers, timeout=15.0)
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                resources = []
                for item in results:
                    title = "Untitled Page"
                    props = item.get("properties", {})
                    for p in props.values():
                        if p.get("type") == "title" and p.get("title"):
                            title = "".join([t.get("plain_text", "") for t in p.get("title")])
                            break
                    resources.append({"id": item["id"], "title": title, "url": item.get("url"), "object": "page"})
                return resources
            return []

    async def fetch_documents(
        self,
        external_resource_id: str, # Selected Notion Page ID ONLY
        employee_id: Optional[str] = None,
        project_id: Optional[str] = None,
        **kwargs
    ) -> List[NormalizedDocument]:
        page_id = external_resource_id

        if not self.access_token or page_id.startswith("notion_page_"):
            mock_doc = NormalizedDocument(
                external_id=f"notion:{page_id}",
                title="Developer Infrastructure Runbook & Deployment Guide",
                content="Infrastructure specs: Kubernetes manifests, Terraform state files stored in S3, GitHub Actions CI/CD workflows for backend services. Managed by Akash Mehta and Priya Deshmukh.",
                provider="NOTION",
                source_url=f"https://notion.so/{page_id}",
                employee_id=employee_id,
                project_id=project_id,
                doc_metadata={"page_id": page_id, "knowledge_type": "runbook"}
            )
            logger.info(f"Fetched Notion page '{page_id}'")
            return [mock_doc]

        async with httpx.AsyncClient() as client:
            # 1. Fetch page details
            page_url = f"https://api.notion.com/v1/pages/{page_id}"
            page_resp = await client.get(page_url, headers=self.headers, timeout=15.0)
            title = "Notion Page"
            source_url = f"https://notion.so/{page_id.replace('-', '')}"
            if page_resp.status_code == 200:
                data = page_resp.json()
                source_url = data.get("url", source_url)
                props = data.get("properties", {})
                for p in props.values():
                    if p.get("type") == "title" and p.get("title"):
                        title = "".join([t.get("plain_text", "") for t in p.get("title")])
                        break

            # 2. Fetch page block children text
            blocks_url = f"https://api.notion.com/v1/blocks/{page_id}/children?page_size=100"
            blocks_resp = await client.get(blocks_url, headers=self.headers, timeout=15.0)
            content_parts = [f"# {title}\n"]

            if blocks_resp.status_code == 200:
                results = blocks_resp.json().get("results", [])
                for b in results:
                    b_type = b.get("type")
                    if b_type and b_type in b:
                        text_objs = b[b_type].get("rich_text", [])
                        text = "".join([t.get("plain_text", "") for t in text_objs])
                        if text:
                            content_parts.append(text)

            content = "\n\n".join(content_parts)

            doc = NormalizedDocument(
                external_id=f"notion:{page_id}",
                title=title,
                content=content,
                provider="NOTION",
                source_url=source_url,
                employee_id=employee_id,
                project_id=project_id,
                doc_metadata={"page_id": page_id}
            )
            logger.info(f"Fetched Notion page '{page_id}' with {len(content)} characters")
            return [doc]
