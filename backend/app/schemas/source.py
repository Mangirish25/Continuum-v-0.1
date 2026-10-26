from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict, Field

class SourceCreate(BaseModel):
    source_type: str = Field(..., description="Provider type: GITHUB, DRIVE, or NOTION")
    name: str = Field(..., min_length=1, description="Display name for this knowledge source")
    url: Optional[str] = Field(None, description="Resource URL or identifier")
    external_resource_id: Optional[str] = Field(None, description="Explicit resource ID if not extracted from URL")
    local_path: Optional[str] = Field(None, description="Explicit local folder path for Drive or Notion sources")
    project_id: Optional[str] = Field(None, description="Optional associated Continuum project ID")
    employee_id: Optional[str] = Field(None, description="Optional associated employee/owner ID")
    resource_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class SourceUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    local_path: Optional[str] = None
    project_id: Optional[str] = None
    employee_id: Optional[str] = None
    status: Optional[str] = None
    resource_metadata: Optional[Dict[str, Any]] = None

class SourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source_type: str
    name: str
    url: Optional[str] = None
    external_resource_id: str
    local_path: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    status: str
    last_synced_at: Optional[datetime] = None
    last_successful_sync_at: Optional[datetime] = None
    last_sync_error: Optional[str] = None
    resource_metadata: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

class SourceSyncResponse(BaseModel):
    source_id: str
    status: str
    message: str
    processed_documents: int = 0
    unchanged_documents: int = 0
