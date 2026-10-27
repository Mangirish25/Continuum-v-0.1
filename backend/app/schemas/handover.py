from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class HandoverCreate(BaseModel):
    employee_id: str
    project_id: Optional[str] = None
    recipient_email: Optional[EmailStr] = None

class HandoverSendRequest(BaseModel):
    recipient_email: Optional[EmailStr] = None
    recipient_name: Optional[str] = None
    cc_email: Optional[EmailStr] = None

class HandoverReverseRequest(BaseModel):
    reason: str = Field(..., min_length=1, description="Non-empty reason for reversing this handover")

class SuccessorRecommendation(BaseModel):
    employee_id: str
    name: str
    email: str
    reason: str
    confidence_score: float

class StructuredHandoverContent(BaseModel):
    summary: str = ""
    contributions: List[str] = Field(default_factory=list)
    projects: List[str] = Field(default_factory=list)
    github_work: List[str] = Field(default_factory=list)
    jira_responsibilities: List[str] = Field(default_factory=list)
    drive_knowledge: List[str] = Field(default_factory=list)
    notion_knowledge: List[str] = Field(default_factory=list)
    critical_knowledge: List[str] = Field(default_factory=list)
    open_tasks: List[str] = Field(default_factory=list)
    knowledge_gaps: List[str] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)
    transfer_priorities: List[str] = Field(default_factory=list)
    recommended_successor: Optional[SuccessorRecommendation] = None

class HandoverOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    employee_id: str
    employee_name: Optional[str] = None
    employee_email: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    status: str  # DRAFT, GENERATING, READY_FOR_REVIEW, SENT, FAILED, REVERSED
    generated_summary: Optional[str] = None
    knowledge_package: Optional[Dict[str, Any]] = None
    recommended_successor_id: Optional[str] = None
    recommended_successor: Optional[Dict[str, Any]] = None
    risk_summary: Optional[Dict[str, Any]] = None
    recipient_email: Optional[str] = None
    sent_at: Optional[datetime] = None
    reversed_at: Optional[datetime] = None
    reversal_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
