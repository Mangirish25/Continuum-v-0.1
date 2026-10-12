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
    """Flow 6: Semantic knowledge search system with evidence ranking."""
    response = await retrieval_service.search_knowledge(payload, db)

    # Grounded LLM explanation synthesis
    if response.results:
        evidence_snippets = [f"- {r.title} ({r.provider}): {r.content[:200]}" for r in response.results[:5]]
        text_body = "\n".join(evidence_snippets)
        explanation = await llm_service.generate(
            f"Query: '{payload.query}'\nRetrieved Evidence:\n{text_body}\nSynthesize a grounded answer based strictly on evidence.",
            system_prompt="Answer strictly from provided evidence. Do not hallucinate."
        )
        response.llm_explanation = explanation
    else:
        response.llm_explanation = "Insufficient evidence found in synchronized knowledge base."

    return response
