from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, HttpUrl, ConfigDict

class ResourceCreate(BaseModel):
    employee_id: Optional[str] = None
    project_id: Optional[str] = None
    provider: str # GITHUB, GOOGLE_DRIVE, NOTION, JIRA
    resource_type: str # REPOSITORY, FOLDER, PAGE, PROJECT_ISSUES
    external_resource_id: str
    external_url: Optional[str] = None
    name: str
    resource_metadata: Optional[Dict[str, Any]] = None

class GitHubResourceCreate(BaseModel):
    url: str
    employee_id: Optional[str] = None
    project_id: Optional[str] = None

class GoogleDriveFolderSelect(BaseModel):
    folder_id: str
    folder_name: str
    employee_id: Optional[str] = None
    project_id: Optional[str] = None

class NotionPageSelect(BaseModel):
    page_id: str
    page_title: str
    employee_id: Optional[str] = None
    project_id: Optional[str] = None

class JiraProjectMap(BaseModel):
    jira_project_key: str
    jira_project_name: str
    project_id: Optional[str] = None

class ResourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    employee_id: Optional[str] = None
    project_id: Optional[str] = None
    provider: str
    resource_type: str
    external_resource_id: str
    external_url: Optional[str] = None
    name: str
    resource_metadata: Dict[str, Any] = {}
    status: str
    last_synced_at: Optional[datetime] = None
    last_sync_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
