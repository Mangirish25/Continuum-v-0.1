from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.integrations.base import BaseConnector, NormalizedDocument
from app.integrations.github import GitHubConnector
from app.integrations.local_folder import LocalFolderConnector

from app.knowledge.normalization import compute_content_hash, normalize_text_content
from app.knowledge.chunking import DocumentChunker
from app.knowledge.embeddings import embedding_service
from app.knowledge.vector_store import vector_store_service

from app.db.models.all_models import EmployeeResource, KnowledgeDocument, KnowledgeChunk, Employee, Project
from app.core.logging import logger

class IngestionPipeline:
    def __init__(self):
        self.chunker = DocumentChunker(chunk_size=600, overlap=100)
        self.embedding_service = embedding_service
        self.vector_store = vector_store_service

    async def get_connector_for_resource(
        self,
        resource: EmployeeResource,
        db: AsyncSession,
        access_token: Optional[str] = None
    ) -> BaseConnector:
        provider_upper = resource.provider.upper()
        if provider_upper == "GITHUB":
            return GitHubConnector()
        elif provider_upper in ["DRIVE", "GOOGLE_DRIVE", "GOOGLEDRIVE", "GDRIVE", "NOTION"]:
            return LocalFolderConnector("DRIVE" if provider_upper != "NOTION" else "NOTION")
        else:
            raise ValueError(f"Unsupported provider connector: {resource.provider}")

    def get_connector(self, provider: str, access_token: Optional[str] = None) -> BaseConnector:
        provider_upper = provider.upper()
        if provider_upper == "GITHUB":
            return GitHubConnector()
        elif provider_upper in ["DRIVE", "GOOGLE_DRIVE", "GOOGLEDRIVE", "GDRIVE", "NOTION"]:
            return LocalFolderConnector("DRIVE" if provider_upper != "NOTION" else "NOTION")
        else:
            raise ValueError(f"Unsupported provider connector: {provider}")

    async def run_sync_for_resource(
        self,
        resource_id: str,
        db: AsyncSession,
        access_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """Run incremental synchronization pipeline for a specific resource."""
        res_stmt = select(EmployeeResource).where(EmployeeResource.id == resource_id)
        result = await db.execute(res_stmt)
        resource = result.scalar_one_or_none()

        if not resource:
            raise ValueError(f"Resource with ID {resource_id} not found")
        if resource.status == "DISABLED":
            raise ValueError(f"Resource with ID {resource_id} is disabled")

        resource.status = "SYNCING"
        resource.last_sync_error = None
        await db.flush()

        try:
            connector = await self.get_connector_for_resource(resource, db, access_token=access_token)
            
            # Resolve employee name and project name for rich attribution
            emp_name = None
            if resource.employee_id:
                emp_stmt = select(Employee).where(Employee.id == resource.employee_id)
                emp = (await db.execute(emp_stmt)).scalar_one_or_none()
                if emp:
                    emp_name = emp.name

            proj_name = None
            if resource.project_id:
                proj_stmt = select(Project).where(Project.id == resource.project_id)
                proj = (await db.execute(proj_stmt)).scalar_one_or_none()
                if proj:
                    proj_name = proj.name

            # 1. Fetch normalized documents from connector
            norm_docs: List[NormalizedDocument] = await connector.fetch_documents(
                external_resource_id=resource.external_resource_id,
                employee_id=resource.employee_id,
                project_id=resource.project_id,
                employee_name=emp_name,
                project_name=proj_name
            )

            processed_count = 0
            unchanged_count = 0
            indexed_paths = set()

            for nd in norm_docs:
                indexed_paths.add(nd.external_id)
                clean_content = normalize_text_content(nd.content)
                content_hash = compute_content_hash(clean_content)

                # Incremental sync check by content_hash + external_id + resource_id
                doc_stmt = select(KnowledgeDocument).where(
                    KnowledgeDocument.resource_id == resource.id,
                    KnowledgeDocument.external_id == nd.external_id
                )
                existing_doc_res = await db.execute(doc_stmt)
                existing_doc = existing_doc_res.scalar_one_or_none()

                if existing_doc and existing_doc.content_hash == content_hash:
                    # Content unchanged, update last_synced_at only
                    existing_doc.last_synced_at = datetime.now(timezone.utc)
                    existing_doc.title = nd.title
                    existing_doc.source_url = nd.source_url
                    existing_doc.doc_metadata = nd.doc_metadata
                    unchanged_count += 1
                    continue

                # Content changed or new document
                if existing_doc:
                    # Delete old chunks from vector store and DB
                    self.vector_store.delete_by_document(existing_doc.id)
                    await db.execute(delete(KnowledgeChunk).where(KnowledgeChunk.document_id == existing_doc.id))
                    
                    doc_obj = existing_doc
                    doc_obj.title = nd.title
                    doc_obj.content = clean_content
                    doc_obj.content_hash = content_hash
                    doc_obj.source_url = nd.source_url
                    doc_obj.doc_metadata = nd.doc_metadata
                    doc_obj.last_synced_at = datetime.now(timezone.utc)
                else:
                    doc_obj = KnowledgeDocument(
                        resource_id=resource.id,
                        employee_id=nd.employee_id or resource.employee_id,
                        project_id=nd.project_id or resource.project_id,
                        provider=resource.provider,
                        external_id=nd.external_id,
                        title=nd.title,
                        content=clean_content,
                        content_hash=content_hash,
                        source_url=nd.source_url,
                        doc_metadata=nd.doc_metadata,
                        last_synced_at=datetime.now(timezone.utc)
                    )
                    db.add(doc_obj)

                await db.flush()

                # 2. Chunking
                base_meta = {
                    "document_id": doc_obj.id,
                    "resource_id": resource.id,
                    "connection_id": resource.id,
                    "employee_id": doc_obj.employee_id or "",
                    "employee_name": emp_name or "",
                    "project_id": doc_obj.project_id or "",
                    "project_name": proj_name or "",
                    "provider": resource.provider,
                    "title": doc_obj.title,
                    "source_url": doc_obj.source_url or "",
                    "knowledge_type": nd.doc_metadata.get("knowledge_type", "general")
                }
                base_meta.update({
                    key: nd.doc_metadata[key]
                    for key in ("file_name", "relative_path", "file_size", "modified_at", "source_type")
                    if key in nd.doc_metadata
                })
                chunks = self.chunker.chunk_document(clean_content, base_meta)

                if chunks:
                    chunk_texts = [c.content for c in chunks]
                    # 3. Embeddings
                    embeddings = self.embedding_service.generate_embeddings(chunk_texts)

                    chunk_ids = []
                    db_chunks = []
                    chunk_metas = []

                    for i, c in enumerate(chunks):
                        c_id = f"{doc_obj.id}_chunk_{c.chunk_index}"
                        chunk_ids.append(c_id)
                        chunk_metas.append(c.metadata)

                        db_chunk = KnowledgeChunk(
                            id=c_id,
                            document_id=doc_obj.id,
                            chunk_index=c.chunk_index,
                            content=c.content,
                            chunk_metadata=c.metadata,
                            embedding_id=c_id
                        )
                        db_chunks.append(db_chunk)

                    db.add_all(db_chunks)

                    # 4. Vector Store Upsert
                    self.vector_store.add_chunks(
                        ids=chunk_ids,
                        embeddings=embeddings,
                        documents=chunk_texts,
                        metadatas=chunk_metas
                    )

                processed_count += 1

            # Remove stale vector/relational data for files that have disappeared from a local folder.
            if isinstance(connector, LocalFolderConnector):
                if not connector.walk_errors:
                    known_paths = indexed_paths | connector.failed_paths
                    previous_stmt = select(KnowledgeDocument).where(KnowledgeDocument.resource_id == resource.id)
                    previous_docs = (await db.execute(previous_stmt)).scalars().all()
                    for previous_doc in previous_docs:
                        if previous_doc.external_id not in known_paths:
                            self.vector_store.delete_by_document(previous_doc.id)
                            await db.delete(previous_doc)

            scan_errors = connector.scan_errors if isinstance(connector, LocalFolderConnector) else []
            resource.status = "PARTIAL" if scan_errors else "SYNCED"
            resource.last_synced_at = datetime.now(timezone.utc)
            resource.last_successful_sync_at = datetime.now(timezone.utc)
            resource.last_sync_error = (
                f"{len(scan_errors)} document(s) could not be indexed: " + "; ".join(
                    f"{error['path']}: {error['error']}" for error in scan_errors[:5]
                )
            ) if scan_errors else None
            res_meta = dict(resource.resource_metadata or {})
            res_meta["indexed_documents_count"] = processed_count
            resource.resource_metadata = res_meta
            await db.commit()

            logger.info(f"Sync completed for resource '{resource.name}' ({resource.id}): {processed_count} processed, {unchanged_count} unchanged")
            return {
                "resource_id": resource.id,
                "status": resource.status,
                "processed_documents": processed_count,
                "unchanged_documents": unchanged_count,
                "failed_documents": len(scan_errors),
            }

        except Exception as e:
            logger.error(f"Sync failed for resource {resource_id}: {e}")
            resource.status = "FAILED"
            resource.last_sync_error = str(e)
            await db.commit()
            raise e

ingestion_pipeline = IngestionPipeline()
