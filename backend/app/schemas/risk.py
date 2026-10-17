from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict

class RiskScoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    employee_id: Optional[str] = None
    project_id: Optional[str] = None
    knowledge_score: float
    continuity_risk: float
    bus_factor: int
    risk_level: str # LOW, MEDIUM, HIGH, CRITICAL
    risk_reasons: List[str] = []
    calculated_at: datetime

class RiskOverviewOut(BaseModel):
    overall_risk_level: str
    total_projects: int
    critical_projects_count: int
    high_risk_employees_count: int
    bus_factor_1_projects_count: int
    average_bus_factor: float
    high_risk_employees: List[Dict[str, Any]] = []
    critical_projects: List[Dict[str, Any]] = []
