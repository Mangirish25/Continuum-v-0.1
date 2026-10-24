from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class JiraWorkspaceConfig(BaseModel):
    workspace_url: str = Field(..., description="Jira workspace URL (e.g. https://continuum.atlassian.net)")
    admin_email: Optional[str] = Field(None, description="Administrator Atlassian email account")
    api_token: str = Field(..., description="Atlassian API token or Personal Access Token")

class JiraWorkspaceVerifyResponse(BaseModel):
    verified: bool
    status: str
    message: str
    workspace_url: Optional[str] = None

class JiraWorkspaceStatus(BaseModel):
    connected: bool
    verified: bool
    workspace_url: Optional[str] = None
    admin_email: Optional[str] = None
    status: str # NOT_CONFIGURED, CONNECTED, VERIFIED, FAILED
    error: Optional[str] = None
    last_synced_at: Optional[datetime] = None
    resources_count: int = 0
    available_projects: List[Dict[str, Any]] = []
