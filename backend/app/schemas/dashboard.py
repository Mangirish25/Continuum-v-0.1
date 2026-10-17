from typing import List, Dict, Any
from pydantic import BaseModel

class DashboardSummaryOut(BaseModel):
    employee_count: int
    connected_source_count: int
    project_count: int
    high_risk_project_count: int
    active_handover_count: int
    risk_distribution: Dict[str, int]
    bus_factor_summary: Dict[str, int]
    critical_projects: List[Dict[str, Any]]
    high_risk_employees: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]
