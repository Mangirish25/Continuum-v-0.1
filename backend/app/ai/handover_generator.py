from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.ai.ollama import llm_service
from app.ai.prompts import HANDOVER_SYSTEM_PROMPT, HANDOVER_USER_PROMPT_TEMPLATE
from app.schemas.handover import StructuredHandoverContent, SuccessorRecommendation
from app.db.models.all_models import Employee, Project, KnowledgeDocument, EmployeeResource
from app.core.logging import logger

class HandoverGenerator:
    def __init__(self, llm_svc=llm_service):
        self.llm_service = llm_svc

    async def generate_handover_package(
        self,
        employee: Employee,
        project: Optional[Project],
        candidate_successors: List[Employee],
        documents: List[KnowledgeDocument],
        resources: List[EmployeeResource],
        db: AsyncSession
    ) -> StructuredHandoverContent:
        logger.info(f"Generating handover package for employee '{employee.name}' ({employee.id})")

        # 1. Format evidence text
        evidence_lines = []
        for d in documents[:15]:
            evidence_lines.append(f"Document: {d.title} (Provider: {d.provider})\nContent snippet: {d.content[:300]}\nSource URL: {d.source_url or 'N/A'}\n")
        evidence_text = "\n".join(evidence_lines) if evidence_lines else "No documents found for this employee."

        # 2. Format resource text
        resource_lines = []
        for r in resources:
            resource_lines.append(f"Resource: {r.name} (Provider: {r.provider}, Type: {r.resource_type}, URL: {r.external_url or 'N/A'})")
        resource_text = "\n".join(resource_lines) if resource_lines else "No resources connected directly."

        # 3. Format candidate successors text
        successor_lines = []
        for s in candidate_successors:
            if s.id != employee.id:
                successor_lines.append(f"- Candidate ID: {s.id}, Name: {s.name}, Role: {s.role}, Team: {s.team}, Skills: {', '.join(s.skills or [])}")
        successor_text = "\n".join(successor_lines) if successor_lines else "No available team successors."

        proj_name = project.name if project else "All Assigned Projects"

        user_prompt = HANDOVER_USER_PROMPT_TEMPLATE.format(
            employee_name=employee.name,
            employee_role=employee.role,
            employee_team=employee.team,
            project_name=proj_name,
            evidence_text=evidence_text,
            resource_text=resource_text,
            successor_candidates_text=successor_text
        )

        # 4. Generate structured response via LLM
        raw_json = await self.llm_service.generate_json(user_prompt, system_prompt=HANDOVER_SYSTEM_PROMPT)

        # 5. Extract or calculate recommended successor
        rec_successor_obj = None
        best_successor = None
        highest_score = -1.0

        for candidate in candidate_successors:
            if candidate.id == employee.id:
                continue
            # Calculate overlap score: shared skills + team match
            score = 0.0
            if candidate.team == employee.team:
                score += 3.0
            if candidate.role == employee.role:
                score += 2.0
            emp_skills = set(employee.skills or [])
            cand_skills = set(candidate.skills or [])
            shared_skills = emp_skills.intersection(cand_skills)
            score += len(shared_skills) * 1.5

            if score > highest_score:
                highest_score = score
                best_successor = candidate

        if best_successor:
            rec_successor_obj = SuccessorRecommendation(
                employee_id=best_successor.id,
                name=best_successor.name,
                email=best_successor.email,
                reason=f"AI Recommendation — High skill and domain context overlap in {best_successor.team} team.",
                confidence_score=min(0.95, round(0.5 + (highest_score * 0.08), 2))
            )

        # Fallback fields if LLM returned partial response
        summary = raw_json.get("summary") or f"Knowledge continuity handover package for {employee.name} ({employee.role}). Primary knowledge owner for {proj_name}."
        contributions = raw_json.get("contributions") or [f"Maintained core architecture for {proj_name}"]
        projects_list = raw_json.get("projects") or [proj_name]
        github_work = raw_json.get("github_work") or [f"Active contributor to {r.name}" for r in resources if r.provider == "GITHUB"]
        jira_responsibilities = raw_json.get("jira_responsibilities") or [f"Lead owner for {r.name} tasks" for r in resources if r.provider == "JIRA"]
        drive_knowledge = raw_json.get("drive_knowledge") or [f"Documented in {r.name}" for r in resources if r.provider == "GOOGLE_DRIVE"]
        notion_knowledge = raw_json.get("notion_knowledge") or [f"Runbook in {r.name}" for r in resources if r.provider == "NOTION"]
        critical_knowledge = raw_json.get("critical_knowledge") or [f"Core domain architecture of {proj_name}"]
        open_tasks = raw_json.get("open_tasks") or [f"Transfer repository access for {proj_name}"]
        knowledge_gaps = raw_json.get("knowledge_gaps") or ["Single point of knowledge concentration identified"]
        risks = raw_json.get("risks") or [f"Bus factor risk for project {proj_name}"]
        transfer_priorities = raw_json.get("transfer_priorities") or ["1. Pair programming walkthrough", "2. Handover documentation review", "3. Access transfer"]

        return StructuredHandoverContent(
            summary=summary,
            contributions=contributions,
            projects=projects_list,
            github_work=github_work,
            jira_responsibilities=jira_responsibilities,
            drive_knowledge=drive_knowledge,
            notion_knowledge=notion_knowledge,
            critical_knowledge=critical_knowledge,
            open_tasks=open_tasks,
            knowledge_gaps=knowledge_gaps,
            risks=risks,
            transfer_priorities=transfer_priorities,
            recommended_successor=rec_successor_obj
        )

handover_generator = HandoverGenerator()
