import re
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.knowledge.embeddings import embedding_service
from app.knowledge.vector_store import vector_store_service
from app.schemas.knowledge import KnowledgeSearchRequest, KnowledgeSearchResponse, KnowledgeSearchEvidence
from app.db.models.all_models import Employee, Project, EmployeeResource, KnowledgeDocument, KnowledgeChunk
from app.core.logging import logger

def normalize_provider(provider_str: Optional[str]) -> Optional[str]:
    """Normalize any user/frontend provider representation into canonical DB/storage form."""
    if not provider_str:
        return None
    p = provider_str.strip().upper().replace("-", "_").replace(" ", "_")
    if p in ["ALL", "ALL_SOURCES", "ANY"]:
        return None
    if p in ["GOOGLE_DRIVE", "GOOGLEDRIVE", "GDRIVE", "DRIVE", "GOOGLE"]:
        return "GOOGLE_DRIVE"
    if p in ["GITHUB", "GIT"]:
        return "GITHUB"
    if p in ["JIRA", "ATLASSIAN"]:
        return "JIRA"
    if p in ["NOTION", "NOTION_PAGE"]:
        return "NOTION"
    return p

class RetrievalService:
    def __init__(self, embedding_svc=embedding_service, vector_svc=vector_store_service):
        self.embedding_service = embedding_svc
        self.vector_store = vector_svc

    async def resolve_target_employee(
        self,
        query: str,
        explicit_employee_id: Optional[str],
        db: AsyncSession
    ) -> Optional[Employee]:
        """
        Resolve employee entity from explicit ID or by matching name tokens in the natural language query.
        Guards against ambiguous substring collisions when multiple employees share similar names.
        """
        if explicit_employee_id:
            emp_res = await db.execute(select(Employee).where(Employee.id == explicit_employee_id))
            return emp_res.scalar_one_or_none()

        all_emps = (await db.execute(select(Employee))).scalars().all()
        if not all_emps:
            return None

        clean_query = query.lower()

        # 1. Exact full name match (highest precedence, case-insensitive)
        exact_matches = [
            emp for emp in all_emps
            if emp.name and emp.name.lower() in clean_query
        ]
        if exact_matches:
            # Pick the longest name match to avoid sub-name collisions
            exact_matches.sort(key=lambda e: len(e.name), reverse=True)
            return exact_matches[0]

        # 2. Token / first-name / last-name match (only if unambiguous)
        query_words = set(re.findall(r"\b[a-zA-Z]{3,}\b", clean_query))
        matching_by_part: List[Tuple[Employee, str]] = []

        for emp in all_emps:
            if not emp.name:
                continue
            parts = [p.lower() for p in emp.name.split() if len(p) >= 3]
            for p in parts:
                if p in query_words:
                    matching_by_part.append((emp, p))

        # Check if the matched token uniquely identifies a single employee
        if matching_by_part:
            unique_matched_employees = list({emp.id: emp for emp, _ in matching_by_part}.values())
            if len(unique_matched_employees) == 1:
                return unique_matched_employees[0]
            logger.info(f"Ambiguous name match in query '{query}': matched {[e.name for e in unique_matched_employees]}. Skipping auto-resolution.")

        return None

    async def search_knowledge(
        self,
        request: KnowledgeSearchRequest,
        db: AsyncSession
    ) -> KnowledgeSearchResponse:
        logger.info(f"Executing employee-aware semantic search for query: '{request.query}'")
        norm_provider = normalize_provider(request.provider)

        # 1. Resolve employee entity if referenced in query or payload
        target_employee = await self.resolve_target_employee(
            request.query, request.employee_id, db
        )
        if target_employee:
            logger.info(f"Resolved query '{request.query}' to employee: {target_employee.name} ({target_employee.id})")

        # 2. Generate embedding for query
        query_embedding = self.embedding_service.generate_embedding(request.query)

        # 3. Vector store retrieval (Semantic search)
        where_filter: Dict[str, Any] = {}
        if norm_provider:
            where_filter["provider"] = norm_provider
        if request.project_id:
            where_filter["project_id"] = request.project_id
        if request.knowledge_type:
            where_filter["knowledge_type"] = request.knowledge_type

        raw_vector_results = self.vector_store.query(
            query_embedding=query_embedding,
            n_results=request.limit * 2,
            where_filter=where_filter if where_filter else None
        )

        candidate_chunks: Dict[str, Dict[str, Any]] = {}

        for item in raw_vector_results:
            chunk_id = item.get("id", "")
            if not chunk_id:
                continue
            candidate_chunks[chunk_id] = {
                "id": chunk_id,
                "document": item.get("document", ""),
                "metadata": item.get("metadata", {}),
                "score": float(item.get("score", 0.0)),
                "source": "vector"
            }

        # 4. Relational & Attribute-based Search in PostgreSQL / SQLite
        # If an employee was resolved or explicit filters set, query indexed chunks directly
        relational_conditions = []
        if target_employee:
            relational_conditions.append(KnowledgeDocument.employee_id == target_employee.id)
            relational_conditions.append(KnowledgeChunk.content.ilike(f"%{target_employee.name}%"))
            relational_conditions.append(KnowledgeDocument.title.ilike(f"%{target_employee.name}%"))

        # Also search keywords from query if query has key terms
        keywords = [w for w in re.findall(r"\b[a-zA-Z0-9_-]{4,}\b", request.query) if w.lower() not in ["tell", "more", "about", "what", "where", "with", "from", "show"]]
        for kw in keywords[:3]:
            relational_conditions.append(KnowledgeChunk.content.ilike(f"%{kw}%"))
            relational_conditions.append(KnowledgeDocument.title.ilike(f"%{kw}%"))

        if relational_conditions:
            db_stmt = (
                select(KnowledgeChunk, KnowledgeDocument)
                .join(KnowledgeDocument, KnowledgeChunk.document_id == KnowledgeDocument.id)
                .where(or_(*relational_conditions))
            )
            if norm_provider:
                db_stmt = db_stmt.where(KnowledgeDocument.provider == norm_provider)
            if request.project_id:
                db_stmt = db_stmt.where(KnowledgeDocument.project_id == request.project_id)

            db_res = await db.execute(db_stmt)
            for chunk, doc in db_res.all():
                c_id = chunk.id
                meta = dict(chunk.chunk_metadata or {})
                meta.setdefault("document_id", doc.id)
                meta.setdefault("provider", doc.provider)
                meta.setdefault("title", doc.title)
                meta.setdefault("source_url", doc.source_url)
                meta.setdefault("employee_id", doc.employee_id)
                meta.setdefault("project_id", doc.project_id)

                # Score boosted for direct employee attribution
                rel_score = 0.85
                if target_employee:
                    if doc.employee_id == target_employee.id:
                        rel_score = 0.95
                    elif target_employee.name.lower() in chunk.content.lower():
                        rel_score = 0.92

                if c_id in candidate_chunks:
                    # Upgrade score
                    candidate_chunks[c_id]["score"] = max(candidate_chunks[c_id]["score"], rel_score)
                    candidate_chunks[c_id]["metadata"].update(meta)
                else:
                    candidate_chunks[c_id] = {
                        "id": c_id,
                        "document": chunk.content,
                        "metadata": meta,
                        "score": rel_score,
                        "source": "relational"
                    }

        # 5. Build and rank evidence items
        evidence_items: List[KnowledgeSearchEvidence] = []

        # Sort candidate chunks by score descending
        sorted_candidates = sorted(candidate_chunks.values(), key=lambda x: x["score"], reverse=True)

        for item in sorted_candidates:
            meta = item.get("metadata", {})
            chunk_id = item.get("id", "")
            doc_id = meta.get("document_id", "")
            title = meta.get("title", "Untitled Document")
            provider = meta.get("provider", "UNKNOWN")
            source_url = meta.get("source_url")
            content_snippet = item.get("document", "")
            score = item.get("score", 0.0)

            # Strict provider filter enforcement
            if norm_provider and provider.upper() != norm_provider.upper():
                continue

            chunk_emp_id = meta.get("employee_id")
            chunk_text = (content_snippet or "").lower()
            chunk_title = (title or "").lower()

            # If the user is querying a specific employee, guard against fabricating or attributing unrelated documents
            if target_employee:
                is_direct_emp = (chunk_emp_id == target_employee.id)
                mentions_emp = (target_employee.name.lower() in chunk_text) or (target_employee.name.lower() in chunk_title)
                if not (is_direct_emp or mentions_emp):
                    continue

            employee_info = None
            emp_id = chunk_emp_id
            if emp_id:
                emp_res = await db.execute(select(Employee).where(Employee.id == emp_id))
                emp = emp_res.scalar_one_or_none()
                if emp:
                    employee_info = {"id": emp.id, "name": emp.name, "email": emp.email, "role": emp.role}
            elif target_employee and ((target_employee.name.lower() in chunk_text) or (target_employee.name.lower() in chunk_title)):
                employee_info = {"id": target_employee.id, "name": target_employee.name, "email": target_employee.email, "role": target_employee.role}

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
                    score=round(score, 4),
                    title=title,
                    provider=provider,
                    source_url=source_url,
                    employee=employee_info,
                    project=project_info,
                    metadata=meta
                )
            )

            if len(evidence_items) >= request.limit:
                break

        # 6. Honest Empty-State Diagnosis
        diagnostic_explanation: Optional[str] = None

        if not evidence_items:
            if target_employee:
                # Check what resources are connected for this employee
                res_stmt = select(EmployeeResource).where(EmployeeResource.employee_id == target_employee.id)
                if norm_provider:
                    res_stmt = res_stmt.where(EmployeeResource.provider == norm_provider)
                emp_resources = (await db.execute(res_stmt)).scalars().all()

                prov_desc = f"from {norm_provider.replace('_', ' ').title()}" if norm_provider else "across connected knowledge sources"

                if not emp_resources:
                    diagnostic_explanation = (
                        f"Employee '{target_employee.name}' ({target_employee.role or 'Team Member'}) "
                        f"is registered in the organizational directory, but has no knowledge sources connected {prov_desc}. "
                        f"To index knowledge for this employee, connect and synchronize a resource in the Connections tab."
                    )
                else:
                    statuses = [r.status for r in emp_resources]
                    if any(s == "FAILED" for s in statuses):
                        failed_res = next(r for r in emp_resources if r.status == "FAILED")
                        diagnostic_explanation = (
                            f"Employee '{target_employee.name}' has a connected resource ('{failed_res.name}'), "
                            f"but synchronization failed: {failed_res.last_sync_error or 'Sync error'}. "
                            f"Please re-test credentials or retry synchronization from Connections."
                        )
                    elif any(s in ["NEEDS_AUTH", "PENDING"] for s in statuses):
                        pending_res = next(r for r in emp_resources if r.status in ["NEEDS_AUTH", "PENDING"])
                        diagnostic_explanation = (
                            f"Employee '{target_employee.name}' has a connected resource ('{pending_res.name}'), "
                            f"but it is awaiting authorization or initial synchronization (Status: {pending_res.status}). "
                            f"Please authenticate and trigger sync to index evidence."
                        )
                    elif any(s == "SYNCING" for s in statuses):
                        diagnostic_explanation = (
                            f"Knowledge sources for '{target_employee.name}' are currently being synchronized. "
                            f"Please wait a few moments and retry your search."
                        )
                    else:
                        diagnostic_explanation = (
                            f"Employee '{target_employee.name}' has connected knowledge sources {prov_desc}, "
                            f"but no indexable documents or matching passages were found for '{request.query}'."
                        )
            elif norm_provider:
                # Check if any sources exist for this provider
                prov_stmt = select(EmployeeResource).where(EmployeeResource.provider == norm_provider)
                prov_sources = (await db.execute(prov_stmt)).scalars().all()
                if not prov_sources:
                    diagnostic_explanation = f"No {norm_provider.replace('_', ' ').title()} knowledge sources have been registered or connected yet."
                else:
                    diagnostic_explanation = f"No matching evidence found in synchronized {norm_provider.replace('_', ' ').title()} documents for query: '{request.query}'."
            else:
                total_chunks_count = (await db.execute(select(KnowledgeChunk))).scalars().all()
                if not total_chunks_count:
                    diagnostic_explanation = "The organizational knowledge base is currently empty. Connect and synchronize knowledge sources (GitHub, Google Drive, Notion, Jira) to index documents."
                else:
                    diagnostic_explanation = f"Insufficient evidence found in synchronized knowledge base for query: '{request.query}'."

        return KnowledgeSearchResponse(
            query=request.query,
            total_results=len(evidence_items),
            results=evidence_items,
            llm_explanation=diagnostic_explanation
        )

retrieval_service = RetrievalService()
