from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.schemas.risk import RiskOverviewOut, RiskScoreOut
from app.services.risk_service import risk_service
from app.db.models.all_models import Admin, Project, RiskScore
from app.api.dependencies import get_current_admin

router = APIRouter(prefix="/risk", tags=["Risk"])

@router.get("/overview", response_model=RiskOverviewOut)
async def get_risk_overview(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Get high-level organizational risk overview."""
    return await risk_service.get_overview(db)

@router.get("/projects", response_model=List[RiskScoreOut])
async def list_project_risks(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """List risk scores and bus factors for all projects."""
    proj_stmt = select(Project)
    projects = (await db.execute(proj_stmt)).scalars().all()
    results = []
    for p in projects:
        risk_stmt = select(RiskScore).where(RiskScore.project_id == p.id).order_by(RiskScore.calculated_at.desc())
        latest = (await db.execute(risk_stmt)).scalars().first()
        if not latest:
            latest = await risk_service.calculate_project_risk(p.id, db)
        results.append(latest)
    return results

@router.get("/employees/{employee_id}")
async def get_employee_risk(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Flow 7: Get individual employee knowledge score and risk level."""
    k_score = await risk_service.calculate_employee_knowledge_score(employee_id, db)
    return {
        "employee_id": employee_id,
        "knowledge_score": k_score,
        "continuity_risk": round(max(0.0, 100.0 - k_score), 1),
        "risk_level": "HIGH" if k_score > 60 else "LOW"
    }

@router.get("/projects/{project_id}", response_model=RiskScoreOut)
async def get_project_risk_detail(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Flow 7: Get project bus factor, risk level, and explainable risk reasons."""
    return await risk_service.calculate_project_risk(project_id, db)

@router.post("/recalculate")
async def recalculate_all_risks(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Force recalculate risks across all projects."""
    proj_stmt = select(Project)
    projects = (await db.execute(proj_stmt)).scalars().all()
    recalculated = 0
    for p in projects:
        await risk_service.calculate_project_risk(p.id, db)
        recalculated += 1
    return {"message": f"Successfully recalculated risks for {recalculated} project(s)"}
