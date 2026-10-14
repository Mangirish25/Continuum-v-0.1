from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.database import get_db
from app.schemas.dashboard import DashboardSummaryOut
from app.services.risk_service import risk_service
from app.db.models.all_models import Employee, Project, EmployeeResource, Handover, RiskScore, Admin
from app.api.dependencies import get_current_admin

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("", response_model=DashboardSummaryOut)
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Aggregate dashboard metrics in a single efficient endpoint."""
    emp_count = (await db.execute(select(func.count(Employee.id)))).scalar() or 0
    res_count = (await db.execute(select(func.count(EmployeeResource.id)))).scalar() or 0
    proj_count = (await db.execute(select(func.count(Project.id)))).scalar() or 0
    handover_count = (await db.execute(select(func.count(Handover.id)).where(Handover.status != "SENT"))).scalar() or 0

    risk_overview = await risk_service.get_overview(db)

    # Risk distribution
    proj_stmt = select(Project)
    projects = (await db.execute(proj_stmt)).scalars().all()
    risk_dist = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    bus_dist = {"1": 0, "2": 0, "3+": 0}

    for p in projects:
        risk_stmt = select(RiskScore).where(RiskScore.project_id == p.id).order_by(RiskScore.calculated_at.desc())
        latest = (await db.execute(risk_stmt)).scalars().first()
        if latest:
            risk_dist[latest.risk_level] = risk_dist.get(latest.risk_level, 0) + 1
            if latest.bus_factor == 1:
                bus_dist["1"] += 1
            elif latest.bus_factor == 2:
                bus_dist["2"] += 1
            else:
                bus_dist["3+"] += 1

    recent_act = []
    notif_stmt = select(Notification).order_by(Notification.created_at.desc()).limit(10)
    notifs = (await db.execute(notif_stmt)).scalars().all()
    for n in notifs:
        recent_act.append({
            "type": n.type,
            "message": f"{n.title}: {n.message}" if n.title else n.message,
            "timestamp": n.created_at.strftime("%Y-%m-%d %H:%M") if n.created_at else "Recently"
        })

    if not recent_act:
        res_stmt = select(EmployeeResource).order_by(EmployeeResource.created_at.desc()).limit(5)
        for r in (await db.execute(res_stmt)).scalars().all():
            recent_act.append({
                "type": "RESOURCE_CONNECTED",
                "message": f"Connected {r.provider} resource '{r.name}'",
                "timestamp": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "Recently"
            })

    return DashboardSummaryOut(
        employee_count=emp_count,
        connected_source_count=res_count,
        project_count=proj_count,
        high_risk_project_count=risk_overview.critical_projects_count,
        active_handover_count=handover_count,
        risk_distribution=risk_dist,
        bus_factor_summary=bus_dist,
        critical_projects=risk_overview.critical_projects,
        high_risk_employees=risk_overview.high_risk_employees,
        recent_activity=recent_act
    )
