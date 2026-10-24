from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.schemas.knowledge import KnowledgeSearchRequest, KnowledgeSearchResponse
from app.knowledge.retrieval import retrieval_service
from app.ai.ollama import llm_service
from app.db.models.all_models import Admin
from app.api.dependencies import get_current_admin

router = APIRouter(prefix="/knowledge", tags=["Knowledge"])

@router.post("/search", response_model=KnowledgeSearchResponse)
async def search_knowledge(
    payload: KnowledgeSearchRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Flow 6: Employee-aware semantic knowledge search system with grounded evidence ranking."""
    response = await retrieval_service.search_knowledge(payload, db)

    # Grounded LLM explanation synthesis
    if response.results:
        evidence_snippets = []
        for r in response.results[:5]:
            emp_tag = f" | Contributor: {r.employee.get('name')}" if r.employee and r.employee.get("name") else ""
            proj_tag = f" | Project: {r.project.get('name')}" if r.project and r.project.get("name") else ""
            evidence_snippets.append(f"- [{r.provider}] {r.title}{emp_tag}{proj_tag}:\n  {r.content[:350]}")
        text_body = "\n\n".join(evidence_snippets)

        prompt = (
            f"Query: '{payload.query}'\n\n"
            f"Retrieved Evidence:\n{text_body}\n\n"
            f"Synthesize a clear, concise, professional answer based strictly on the retrieved evidence. "
            f"If the query asks about an employee, summarize their role, project assignments, and key contributions from the evidence. "
            f"Do not invent any facts, skills, or responsibilities."
        )

        explanation = await llm_service.generate(
            prompt,
            system_prompt="You are Continuum AI. Answer strictly from provided evidence. Do not hallucinate."
        )

        # If LLM service is offline or returned generic stub, generate high-quality grounded deterministic synthesis
        if not explanation or explanation.startswith("[Ollama AI Summary"):
            providers = list(dict.fromkeys(r.provider for r in response.results))
            emp_contributors = list(dict.fromkeys(
                r.employee.get("name") for r in response.results if r.employee and r.employee.get("name")
            ))
            
            lines = []
            if emp_contributors and any(emp.lower() in payload.query.lower() for emp in emp_contributors):
                target_emp = next(emp for emp in emp_contributors if emp.lower() in payload.query.lower())
                matching_docs = [r for r in response.results if r.employee and r.employee.get("name") == target_emp]
                lines.append(f"Grounded knowledge summary for {target_emp} across {len(matching_docs)} indexed document(s):")
                for r in matching_docs[:4]:
                    lines.append(f"• {r.title} ({r.provider}): {r.content[:220].strip()}...")
            else:
                lines.append(f"Retrieved {len(response.results)} verified evidence passage(s) across {', '.join(providers)}:")
                for r in response.results[:4]:
                    emp_str = f" [Contributor: {r.employee['name']}]" if r.employee else ""
                    lines.append(f"• {r.title} ({r.provider}){emp_str}: {r.content[:220].strip()}...")

            explanation = "\n\n".join(lines)

        response.llm_explanation = explanation

    return response
