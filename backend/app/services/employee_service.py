from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from app.db.models.all_models import Employee, Project, EmployeeResource, employee_projects
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeOut
from app.services.risk_service import risk_service
from app.core.exceptions import NotFoundException, ConflictException
from app.core.logging import logger

class EmployeeService:
    async def create_employee(self, data: EmployeeCreate, db: AsyncSession) -> EmployeeOut:
        # Check email uniqueness
        existing_stmt = select(Employee).where(Employee.email == data.email)
        existing = (await db.execute(existing_stmt)).scalar_one_or_none()
        if existing:
            raise ConflictException(f"Employee with email '{data.email}' already exists.")

        emp = Employee(
            name=data.name,
            email=data.email,
            role=data.role,
            team=data.team,
            status=data.status,
            skills=data.skills,
            jira_account_id=data.jira_account_id
        )

        if data.project_ids:
            proj_stmt = select(Project).where(Project.id.in_(data.project_ids))
            projects = (await db.execute(proj_stmt)).scalars().all()
            emp.projects = list(projects)

        db.add(emp)
        await db.commit()
        await db.refresh(emp)

        return await self.get_employee_detail(emp.id, db)

    async def get_employee_detail(self, employee_id: str, db: AsyncSession) -> EmployeeOut:
        stmt = (
            select(Employee)
            .where(Employee.id == employee_id)
            .options(selectinload(Employee.projects), selectinload(Employee.resources))
        )
        res = await db.execute(stmt)
        emp = res.scalar_one_or_none()

        if not emp:
            raise NotFoundException(f"Employee with ID {employee_id} not found.")

        k_score = await risk_service.calculate_employee_knowledge_score(emp.id, db)

        projects_data = [{"id": p.id, "name": p.name, "status": p.status} for p in emp.projects]

        return EmployeeOut(
            id=emp.id,
            name=emp.name,
            email=emp.email,
            role=emp.role,
            team=emp.team,
            status=emp.status,
            skills=emp.skills or [],
            jira_account_id=emp.jira_account_id,
            created_at=emp.created_at,
            updated_at=emp.updated_at,
            knowledge_score=k_score,
            continuity_risk=75.0 if emp.status == "LEAVING" else round(max(0.0, 100.0 - k_score), 1),
            risk_level="CRITICAL" if emp.status == "LEAVING" else ("HIGH" if k_score > 60 else "LOW"),
            projects=projects_data,
            connected_resources_count=len(emp.resources)
        )

    async def list_employees(
        self,
        db: AsyncSession,
        search: Optional[str] = None,
        team: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[EmployeeOut]:
        stmt = select(Employee)
        if search:
            stmt = stmt.where(
                or_(
                    Employee.name.ilike(f"%{search}%"),
                    Employee.email.ilike(f"%{search}%"),
                    Employee.role.ilike(f"%{search}%")
                )
            )
        if team:
            stmt = stmt.where(Employee.team == team)
        if status:
            stmt = stmt.where(Employee.status == status)

        stmt = stmt.offset(skip).limit(limit)
        results = (await db.execute(stmt)).scalars().all()

        output = []
        for e in results:
            detail = await self.get_employee_detail(e.id, db)
            output.append(detail)
        return output

    async def update_employee(self, employee_id: str, data: EmployeeUpdate, db: AsyncSession) -> EmployeeOut:
        stmt = select(Employee).where(Employee.id == employee_id).options(selectinload(Employee.projects))
        emp = (await db.execute(stmt)).scalar_one_or_none()
        if not emp:
            raise NotFoundException(f"Employee {employee_id} not found.")

        if data.name is not None:
            emp.name = data.name
        if data.email is not None:
            emp.email = data.email
        if data.role is not None:
            emp.role = data.role
        if data.team is not None:
            emp.team = data.team
        if data.status is not None:
            emp.status = data.status
        if data.skills is not None:
            emp.skills = data.skills
        if data.jira_account_id is not None:
            emp.jira_account_id = data.jira_account_id

        if data.project_ids is not None:
            proj_stmt = select(Project).where(Project.id.in_(data.project_ids))
            projs = (await db.execute(proj_stmt)).scalars().all()
            emp.projects = list(projs)

        await db.commit()
        return await self.get_employee_detail(employee_id, db)

    async def delete_employee(self, employee_id: str, db: AsyncSession) -> bool:
        stmt = select(Employee).where(Employee.id == employee_id)
        emp = (await db.execute(stmt)).scalar_one_or_none()
        if not emp:
            raise NotFoundException(f"Employee {employee_id} not found.")

        await db.delete(emp)
        await db.commit()
        return True

employee_service = EmployeeService()
