import asyncio
from app.workers.celery_app import celery_app
from app.db.database import SyncSessionLocal
from app.knowledge.pipeline import ingestion_pipeline
from app.services.risk_service import risk_service
from app.core.logging import logger

def run_async(coro):
    """Utility helper to execute async coroutines inside synchronous Celery worker tasks."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()

@celery_app.task(name="sync_resource")
def sync_resource_task(resource_id: str):
    logger.info(f"Celery task starting sync_resource for resource {resource_id}")
    async def _impl():
        from app.db.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            return await ingestion_pipeline.run_sync_for_resource(resource_id, session)
    return run_async(_impl())

@celery_app.task(name="recalculate_project_risk")
def recalculate_project_risk_task(project_id: str):
    logger.info(f"Celery task recalculating risk for project {project_id}")
    async def _impl():
        from app.db.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            res = await risk_service.calculate_project_risk(project_id, session)
            return {"project_id": project_id, "risk_level": res.risk_level, "bus_factor": res.bus_factor}
    return run_async(_impl())
