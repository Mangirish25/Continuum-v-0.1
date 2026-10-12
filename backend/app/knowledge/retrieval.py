from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.knowledge.embeddings import embedding_service
from app.knowledge.vector_store import vector_store_service
from app.schemas.knowledge import KnowledgeSearchRequest, KnowledgeSearchResponse, KnowledgeSearchEvidence
from app.db.models.all_models import Employee, Project
from app.core.logging import logger

class RetrievalService:
    def __init__(self, embedding_svc=embedding_service, vector_svc=vector_store_service):
        self.embedding_service = embedding_svc
        self.vector_store = vector_svc

    async def search_knowledge(
        self,
        request: KnowledgeSearchRequest,
        db: AsyncSession
    ) -> KnowledgeSearchResponse:
        logger.info(f"Executing semantic search for query: '{request.query}'")
        
        # 1. Embed search query
        query_embedding = self.embedding_service.generate_embedding(request.query)

        # 2. Build metadata filters
        where_filter = {}
        if request.employee_id:
            where_filter["employee_id"] = request.employee_id
        if request.project_id:
            where_filter["project_id"] = request.project_id
        if request.provider:
            where_filter["provider"] = request.provider.upper()
        if request.knowledge_type:
            where_filter["knowledge_type"] = request.knowledge_type

        # 3. Perform vector retrieval
        raw_results = self.vector_store.query(
            query_embedding=query_embedding,
            n_results=request.limit,
            where_filter=where_filter if where_filter else None
        )

        evidence_items: List[KnowledgeSearchEvidence] = []

        # 4. Resolve relational metadata for evidence traceability
        for item in raw_results:
            meta = item.get("metadata", {})
            chunk_id = item.get("id", "")
            doc_id = meta.get("document_id", "")
            title = meta.get("title", "Untitled Document")
            provider = meta.get("provider", "UNKNOWN")
            source_url = meta.get("source_url")
            content_snippet = item.get("document", "")
            score = item.get("score", 0.0)

            employee_info = None
            emp_id = meta.get("employee_id")
            if emp_id:
                emp_res = await db.execute(select(Employee).where(Employee.id == emp_id))
                emp = emp_res.scalar_one_or_none()
                if emp:
                    employee_info = {"id": emp.id, "name": emp.name, "email": emp.email, "role": emp.role}

            project_info = None
            proj_id = meta.get("project_id")
            if proj_id:
                proj_res = await db.execute(select(Project).where(Project.id == proj_id))
                proj = proj_res.scalar_one_or_none()
                if proj:
                    project_info = {"id": proj.id, "name": proj.name}

            evidence_items.append(
                KnowledgeSearchEvidence(
                    chunk_id=chunk_id,
                    document_id=doc_id,
                    content=content_snippet,
                    score=score,
                    title=title,
                    provider=provider,
                    source_url=source_url,
                    employee=employee_info,
                    project=project_info,
                    metadata=meta
                )
            )

        return KnowledgeSearchResponse(
            query=request.query,
            total_results=len(evidence_items),
            results=evidence_items,
            llm_explanation=None
        )

retrieval_service = RetrievalService()
