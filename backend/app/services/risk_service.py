from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.models.all_models import Employee, Project, EmployeeResource, KnowledgeDocument, KnowledgeChunk, RiskScore
from app.schemas.risk import RiskOverviewOut, RiskScoreOut
from app.core.logging import logger

from sqlalchemy.orm import selectinload

class RiskService:
    async def calculate_employee_knowledge_score(
        self,
        employee_id: str,
        db: AsyncSession
    ) -> float:
        """Calculate employee knowledge score (0-100 heuristic)."""
        # Count resources
        res_stmt = select(func.count(EmployeeResource.id)).where(EmployeeResource.employee_id == employee_id)
        res_count = (await db.execute(res_stmt)).scalar() or 0

        # Count documents
        doc_stmt = select(func.count(KnowledgeDocument.id)).where(KnowledgeDocument.employee_id == employee_id)
        doc_count = (await db.execute(doc_stmt)).scalar() or 0

        # Count chunks
        chunk_stmt = select(func.count(KnowledgeChunk.id)).join(KnowledgeDocument).where(KnowledgeDocument.employee_id == employee_id)
        chunk_count = (await db.execute(chunk_stmt)).scalar() or 0

        # Calculate score
        raw_score = (res_count * 15.0) + (doc_count * 10.0) + (chunk_count * 2.5)
        normalized_score = min(100.0, round(raw_score, 1))
        return normalized_score

    async def calculate_project_risk(
        self,
        project_id: str,
        db: AsyncSession
    ) -> RiskScore:
        """Calculate project bus factor, continuity risk, and risk reasons."""
        proj_stmt = select(Project).where(Project.id == project_id).options(selectinload(Project.employees))
        project = (await db.execute(proj_stmt)).scalar_one_or_none()

        if not project:
            raise ValueError(f"Project {project_id} not found")

        members = project.employees
        member_count = len(members)

        if member_count == 0:
            # High risk default if no members
            score_obj = RiskScore(
                project_id=project_id,
                knowledge_score=0.0,
                continuity_risk=90.0,
                bus_factor=0,
                risk_level="CRITICAL",
                risk_reasons=["Project has 0 assigned team members", "No knowledge continuity owner identified"],
                calculated_at=datetime.now(timezone.utc)
            )
            db.add(score_obj)
            await db.commit()
            return score_obj

        # Calculate knowledge scores per member
        member_scores = {}
        total_project_knowledge = 0.0
        leaving_members = []

        for m in members:
            if m.status == "LEAVING":
                leaving_members.append(m.name)
            k_score = await self.calculate_employee_knowledge_score(m.id, db)
            # Add base participation score
            k_score += 10.0
            member_scores[m.id] = {"employee": m, "score": k_score}
            total_project_knowledge += k_score

        if total_project_knowledge == 0.0:
            total_project_knowledge = 1.0

        # Knowledge concentration percentages
        sorted_members = sorted(member_scores.values(), key=lambda x: x["score"], reverse=True)
        top_contributor = sorted_members[0]
        top_share = top_contributor["score"] / total_project_knowledge

        # Bus Factor calculation logic
        bus_factor = 1
        cum_share = 0.0
        for idx, item in enumerate(sorted_members):
            cum_share += item["score"] / total_project_knowledge
            if cum_share >= 0.65:
                bus_factor = idx + 1
                break
        if bus_factor > member_count:
            bus_factor = member_count

        # Risk Score calculation
        continuity_risk_score = 0.0
        reasons: List[str] = []

        if bus_factor == 1:
            continuity_risk_score += 45.0
            reasons.append(f"Bus Factor is 1: {round(top_share * 100, 1)}% of identified project knowledge is concentrated in primary owner '{top_contributor['employee'].name}'")
        elif bus_factor == 2:
            continuity_risk_score += 25.0
            reasons.append("Bus Factor is 2: Critical knowledge concentrated in top 2 team members")

        if top_share >= 0.60:
            continuity_risk_score += 20.0
            reasons.append(f"High knowledge concentration: '{top_contributor['employee'].name}' holds {round(top_share * 100, 1)}% of project knowledge")

        if leaving_members:
            continuity_risk_score += 30.0
            reasons.append(f"Continuity threat: Key member(s) {', '.join(leaving_members)} are currently LEAVING")

        # Check documentation count
        doc_count_stmt = select(func.count(KnowledgeDocument.id)).where(KnowledgeDocument.project_id == project_id)
        doc_count = (await db.execute(doc_count_stmt)).scalar() or 0

        if doc_count < 3:
            continuity_risk_score += 15.0
            reasons.append(f"Documentation gap: Only {doc_count} knowledge document(s) synchronized for this project")

        final_risk_score = min(100.0, round(continuity_risk_score, 1))

        if final_risk_score >= 75.0:
            risk_level = "CRITICAL"
        elif final_risk_score >= 50.0:
            risk_level = "HIGH"
        elif final_risk_score >= 25.0:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        risk_obj = RiskScore(
            project_id=project_id,
            knowledge_score=round(total_project_knowledge, 1),
            continuity_risk=final_risk_score,
            bus_factor=bus_factor,
            risk_level=risk_level,
            risk_reasons=reasons if reasons else ["Knowledge is evenly distributed across team members"],
            calculated_at=datetime.now(timezone.utc)
        )

        db.add(risk_obj)
        await db.commit()
        return risk_obj

    async def get_overview(self, db: AsyncSession) -> RiskOverviewOut:
        # Fetch all active projects
        proj_stmt = select(Project)
        projects = (await db.execute(proj_stmt)).scalars().all()

        total_projects = len(projects)
        critical_projects_count = 0
        bus_factor_1_count = 0
        total_bus_factor = 0
        critical_projects_list = []

        for p in projects:
            risk_stmt = select(RiskScore).where(RiskScore.project_id == p.id).order_by(RiskScore.calculated_at.desc())
            latest_risk = (await db.execute(risk_stmt)).scalars().first()

            if not latest_risk:
                latest_risk = await self.calculate_project_risk(p.id, db)

            if latest_risk.risk_level in ["HIGH", "CRITICAL"]:
                critical_projects_count += 1
                critical_projects_list.append({
                    "id": p.id,
                    "name": p.name,
                    "bus_factor": latest_risk.bus_factor,
                    "risk_level": latest_risk.risk_level,
                    "continuity_risk": latest_risk.continuity_risk,
                    "reasons": latest_risk.risk_reasons
                })

            if latest_risk.bus_factor == 1:
                bus_factor_1_count += 1
            total_bus_factor += latest_risk.bus_factor

        # Fetch high risk / leaving employees
        emp_stmt = select(Employee)
        employees = (await db.execute(emp_stmt)).scalars().all()
        high_risk_emp_list = []

        for e in employees:
            k_score = await self.calculate_employee_knowledge_score(e.id, db)
            if e.status == "LEAVING" or k_score >= 50.0:
                high_risk_emp_list.append({
                    "id": e.id,
                    "name": e.name,
                    "email": e.email,
                    "role": e.role,
                    "team": e.team,
                    "status": e.status,
                    "knowledge_score": k_score,
                    "risk_level": "CRITICAL" if e.status == "LEAVING" else "HIGH"
                })

        avg_bus_factor = round(total_bus_factor / total_projects, 1) if total_projects > 0 else 0.0
        overall_level = "CRITICAL" if critical_projects_count > 0 or len([e for e in employees if e.status == "LEAVING"]) > 0 else "LOW"

        return RiskOverviewOut(
            overall_risk_level=overall_level,
            total_projects=total_projects,
            critical_projects_count=critical_projects_count,
            high_risk_employees_count=len(high_risk_emp_list),
            bus_factor_1_projects_count=bus_factor_1_count,
            average_bus_factor=avg_bus_factor,
            high_risk_employees=high_risk_emp_list,
            critical_projects=critical_projects_list
        )

risk_service = RiskService()
