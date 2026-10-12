from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.db.models.all_models import EmployeeResource, KnowledgeDocument
from app.schemas.resource import ResourceCreate, ResourceOut
from app.knowledge.pipeline import ingestion_pipeline
from app.knowledge.vector_store import vector_store_service
from app.services.risk_service import risk_service
from app.core.exceptions import NotFoundException, BadRequestException
from app.core.logging import logger

class ResourceService:
    async def create_resource(self, data: ResourceCreate, db: AsyncSession) -> EmployeeResource:
        # Check duplicate
        stmt = select(EmployeeResource).where(
            EmployeeResource.provider == data.provider.upper(),
            EmployeeResource.external_resource_id == data.external_resource_id
        )
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            return existing

        res = EmployeeResource(
            employee_id=data.employee_id,
            project_id=data.project_id,
            provider=data.provider.upper(),
            resource_type=data.resource_type.upper(),
            external_resource_id=data.external_resource_id,
            external_url=data.external_url,
            name=data.name,
            resource_metadata=data.resource_metadata or {},
            status="CONNECTED"
        )
        db.add(res)
        await db.commit()
        await db.refresh(res)
        return res

    async def list_resources(
        self,
        db: AsyncSession,
        employee_id: Optional[str] = None,
        project_id: Optional[str] = None,
        provider: Optional[str] = None
    ) -> List[EmployeeResource]:
        stmt = select(EmployeeResource)
        if employee_id:
            stmt = stmt.where(EmployeeResource.employee_id == employee_id)
        if project_id:
            stmt = stmt.where(EmployeeResource.project_id == project_id)
        if provider:
            stmt = stmt.where(EmployeeResource.provider == provider.upper())

        return (await db.execute(stmt)).scalars().all()

    async def get_resource(self, resource_id: str, db: AsyncSession) -> EmployeeResource:
        stmt = select(EmployeeResource).where(EmployeeResource.id == resource_id)
        res = (await db.execute(stmt)).scalar_one_or_none()
        if not res:
            raise NotFoundException(f"Resource {resource_id} not found.")
        return res

    async def sync_resource(self, resource_id: str, db: AsyncSession, access_token: Optional[str] = None) -> Dict[str, Any]:
        res = await self.get_resource(resource_id, db)
        sync_result = await ingestion_pipeline.run_sync_for_resource(resource_id, db, access_token=access_token)
        
        # Recalculate project risk if project assigned
        if res.project_id:
            await risk_service.calculate_project_risk(res.project_id, db)

        return sync_result

    async def delete_resource(self, resource_id: str, db: AsyncSession) -> bool:
        res = await self.get_resource(resource_id, db)
        
        # Delete associated knowledge documents and vector chunks
        docs_stmt = select(KnowledgeDocument).where(KnowledgeDocument.resource_id == resource_id)
        docs = (await db.execute(docs_stmt)).scalars().all()
        for d in docs:
            vector_store_service.delete_by_document(d.id)

        await db.delete(res)
        await db.commit()

        if res.project_id:
            await risk_service.calculate_project_risk(res.project_id, db)

        return True

resource_service = ResourceService()
