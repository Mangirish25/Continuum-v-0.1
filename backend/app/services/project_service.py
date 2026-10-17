from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.models.all_models import Project, Employee, EmployeeResource, RiskScore
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut
from app.services.risk_service import risk_service
from app.core.exceptions import NotFoundException
from app.core.logging import logger

class ProjectService:
    async def create_project(self, data: ProjectCreate, db: AsyncSession) -> ProjectOut:
        proj = Project(
            name=data.name,
            description=data.description,
            status=data.status
        )

        if data.member_ids:
            emp_stmt = select(Employee).where(Employee.id.in_(data.member_ids))
            members = (await db.execute(emp_stmt)).scalars().all()
            proj.employees = list(members)

        db.add(proj)
        await db.commit()
        await db.refresh(proj)

        # Trigger risk calculation
        await risk_service.calculate_project_risk(proj.id, db)
        return await self.get_project_detail(proj.id, db)

    async def get_project_detail(self, project_id: str, db: AsyncSession) -> ProjectOut:
        stmt = (
            select(Project)
            .where(Project.id == project_id)
            .options(selectinload(Project.employees), selectinload(Project.resources))
        )
        res = await db.execute(stmt)
        proj = res.scalar_one_or_none()

        if not proj:
            raise NotFoundException(f"Project with ID {project_id} not found.")

        # Get latest risk score
        risk_stmt = select(RiskScore).where(RiskScore.project_id == proj.id).order_by(RiskScore.calculated_at.desc())
        latest_risk = (await db.execute(risk_stmt)).scalars().first()

        if not latest_risk:
            latest_risk = await risk_service.calculate_project_risk(proj.id, db)

        members_data = [
            {"id": m.id, "name": m.name, "email": m.email, "role": m.role, "team": m.team, "status": m.status}
            for m in proj.employees
        ]

        return ProjectOut(
            id=proj.id,
            name=proj.name,
            description=proj.description,
            status=proj.status,
            created_at=proj.created_at,
            updated_at=proj.updated_at,
            bus_factor=latest_risk.bus_factor,
            continuity_risk=latest_risk.continuity_risk,
            risk_level=latest_risk.risk_level,
            risk_reasons=latest_risk.risk_reasons or [],
            members_count=len(members_data),
            members=members_data,
            connected_resources_count=len(proj.resources)
        )

    async def list_projects(
        self,
        db: AsyncSession,
        search: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[ProjectOut]:
        stmt = select(Project)
        if search:
            stmt = stmt.where(Project.name.ilike(f"%{search}%"))
        if status:
            stmt = stmt.where(Project.status == status)

        stmt = stmt.offset(skip).limit(limit)
        results = (await db.execute(stmt)).scalars().all()

        output = []
        for p in results:
            detail = await self.get_project_detail(p.id, db)
            output.append(detail)
        return output

    async def update_project(self, project_id: str, data: ProjectUpdate, db: AsyncSession) -> ProjectOut:
        stmt = select(Project).where(Project.id == project_id).options(selectinload(Project.employees))
        proj = (await db.execute(stmt)).scalar_one_or_none()
        if not proj:
            raise NotFoundException(f"Project {project_id} not found.")

        if data.name is not None:
            proj.name = data.name
        if data.description is not None:
            proj.description = data.description
        if data.status is not None:
            proj.status = data.status

        if data.member_ids is not None:
            emp_stmt = select(Employee).where(Employee.id.in_(data.member_ids))
            members = (await db.execute(emp_stmt)).scalars().all()
            proj.employees = list(members)

        await db.commit()
        await risk_service.calculate_project_risk(project_id, db)
        return await self.get_project_detail(project_id, db)

    async def delete_project(self, project_id: str, db: AsyncSession) -> bool:
        stmt = select(Project).where(Project.id == project_id)
        proj = (await db.execute(stmt)).scalar_one_or_none()
        if not proj:
            raise NotFoundException(f"Project {project_id} not found.")

        await db.delete(proj)
        await db.commit()
        return True

project_service = ProjectService()
