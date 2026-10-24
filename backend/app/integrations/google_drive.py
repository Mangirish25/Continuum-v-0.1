import httpx
from typing import List, Dict, Any, Optional
from app.integrations.base import BaseConnector, NormalizedDocument
from app.core.config import settings
from app.core.logging import logger

class GoogleDriveConnector(BaseConnector):
    def __init__(self, access_token: Optional[str] = None):
        self.access_token = access_token
        self.headers = {}
        if self.access_token:
            self.headers["Authorization"] = f"Bearer {self.access_token}"

    async def validate_connection(self) -> bool:
        if not self.access_token:
            return False
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/drive/v3/about?fields=user",
                headers=self.headers,
                timeout=10.0
            )
            return resp.status_code == 200

    async def list_resources(self) -> List[Dict[str, Any]]:
        """List folders in Google Drive for folder selection."""
        if not self.access_token:
            # Fallback mock folders for demonstration / dev mode
            return [
                {"id": "folder_gdrive_architecture", "name": "Architecture & Engineering Docs", "mimeType": "application/vnd.google-apps.folder"},
                {"id": "folder_gdrive_payments", "name": "Payment Gateway Specifications", "mimeType": "application/vnd.google-apps.folder"},
                {"id": "folder_gdrive_onboarding", "name": "Team Knowledge & Onboarding", "mimeType": "application/vnd.google-apps.folder"}
            ]

        async with httpx.AsyncClient() as client:
            query = "mimeType = 'application/vnd.google-apps.folder' and trashed = false"
            url = f"https://www.googleapis.com/drive/v3/files?q={query}&fields=files(id,name,mimeType)"
            resp = await client.get(url, headers=self.headers, timeout=15.0)
            if resp.status_code == 200:
                return resp.json().get("files", [])
            return []

    async def fetch_documents(
        self,
        external_resource_id: str, # Selected Folder ID ONLY
        employee_id: Optional[str] = None,
        project_id: Optional[str] = None,
        **kwargs
    ) -> List[NormalizedDocument]:
        documents: List[NormalizedDocument] = []
        folder_id = external_resource_id

        if not self.access_token or folder_id.startswith("folder_gdrive_") or "mock" in str(self.access_token).lower():
            # Return realistic normalized documents for selected mock folder
            emp_name = kwargs.get("employee_name") or "Rahul Sharma"
            mock_docs = [
                NormalizedDocument(
                    external_id=f"gdrive:{folder_id}:doc1",
                    title="Payment Gateway Architecture & Failover Strategy",
                    content=f"The Payment Gateway integrates Stripe and Adyen with automated failover logic. Key retry mechanisms are managed via exponential backoff. System lead maintainer: {emp_name}. Primary knowledge owner for payment service resilience.",
                    provider="GOOGLE_DRIVE",
                    source_url=f"https://drive.google.com/file/d/{folder_id}_doc1",
                    employee_id=employee_id,
                    project_id=project_id,
                    doc_metadata={"folder_id": folder_id, "file_type": "gdoc", "knowledge_type": "architecture", "contributor": emp_name, "employee_name": emp_name}
                ),
                NormalizedDocument(
                    external_id=f"gdrive:{folder_id}:doc2",
                    title="Database Sharding & Data Continuity Handbook",
                    content=f"Database migration patterns, connection pooling setup, and snapshot recovery rules. Document authored by {emp_name}. Crucial environment variables must be rotated using AWS Secrets Manager.",
                    provider="GOOGLE_DRIVE",
                    source_url=f"https://drive.google.com/file/d/{folder_id}_doc2",
                    employee_id=employee_id,
                    project_id=project_id,
                    doc_metadata={"folder_id": folder_id, "file_type": "gdoc", "knowledge_type": "database", "contributor": emp_name, "employee_name": emp_name}
                )
            ]
            logger.info(f"Fetched {len(mock_docs)} documents from Google Drive folder '{folder_id}' for employee '{emp_name}'")
            return mock_docs

        async with httpx.AsyncClient() as client:
            # Strictly restrict search to items inside the selected folder only
            query = f"'{folder_id}' in parents and trashed = false"
            url = f"https://www.googleapis.com/drive/v3/files?q={query}&fields=files(id,name,mimeType,webViewLink)"
            resp = await client.get(url, headers=self.headers, timeout=15.0)
            if resp.status_code == 200:
                files = resp.json().get("files", [])
                for f in files:
                    file_id = f["id"]
                    file_name = f["name"]
                    web_link = f.get("webViewLink", f"https://drive.google.com/file/d/{file_id}")
                    
                    # Export Google Doc as plain text
                    export_url = f"https://www.googleapis.com/drive/v3/files/{file_id}/export?mimeType=text/plain"
                    text_resp = await client.get(export_url, headers=self.headers, timeout=15.0)
                    content = text_resp.text if text_resp.status_code == 200 else f"Document: {file_name}"

                    documents.append(
                        NormalizedDocument(
                            external_id=f"gdrive:{folder_id}:{file_id}",
                            title=file_name,
                            content=content,
                            provider="GOOGLE_DRIVE",
                            source_url=web_link,
                            employee_id=employee_id,
                            project_id=project_id,
                            doc_metadata={"folder_id": folder_id, "mime_type": f.get("mimeType")}
                        )
                    )

        logger.info(f"Fetched {len(documents)} documents from Google Drive folder '{folder_id}'")
        return documents
