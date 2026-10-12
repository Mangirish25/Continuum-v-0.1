from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "ACTIVE" # ACTIVE, COMPLETED, ARCHIVED

class ProjectCreate(ProjectBase):
    member_ids: Optional[List[str]] = Field(default_factory=list)

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    member_ids: Optional[List[str]] = None

class ProjectOut(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
    bus_factor: int = 1
    continuity_risk: float = 0.0
    risk_level: str = "LOW"
    risk_reasons: List[str] = Field(default_factory=list)
    members_count: int = 0
    members: List[Dict[str, Any]] = Field(default_factory=list)
    connected_resources_count: int = 0
