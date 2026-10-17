from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class EmployeeBase(BaseModel):
    name: str
    email: EmailStr
    role: str
    team: str
    status: str = "ACTIVE" # ACTIVE, LEAVING, INACTIVE
    skills: List[str] = Field(default_factory=list)
    jira_account_id: Optional[str] = None

class EmployeeCreate(EmployeeBase):
    project_ids: Optional[List[str]] = Field(default_factory=list)

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    team: Optional[str] = None
    status: Optional[str] = None
    skills: Optional[List[str]] = None
    jira_account_id: Optional[str] = None
    project_ids: Optional[List[str]] = None

class EmployeeShort(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: EmailStr
    role: str
    team: str
    status: str

class EmployeeOut(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
    knowledge_score: float = 0.0
    continuity_risk: float = 0.0
    risk_level: str = "LOW"
    projects: List[Dict[str, Any]] = Field(default_factory=list)
    connected_resources_count: int = 0
