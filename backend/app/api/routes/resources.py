from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_admin
from app.core.exceptions import BadRequestException
from app.db.database import get_db
from app.db.models.all_models import Admin
from app.integrations.github import GitHubConnector
from app.schemas.resource import GitHubResourceCreate, ResourceCreate, ResourceOut
from app.services.resource_service import resource_service

router = APIRouter(prefix="/resources", tags=["Resources"])


@router.get("", response_model=List[ResourceOut])
async def list_resources(
    employee_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return await resource_service.list_resources(db, employee_id=employee_id, project_id=project_id, provider=provider)


@router.post("", response_model=ResourceOut, status_code=status.HTTP_201_CREATED)
async def create_resource(
    payload: ResourceCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    if payload.provider.upper() != "GITHUB":
        raise BadRequestException("Drive and Notion connections must use /sources with an explicitly validated local_path.")
    resource = await resource_service.create_resource(payload, db)
    background_tasks.add_task(resource_service.sync_resource_background, resource.id)
    return resource


@router.post("/github", response_model=ResourceOut, status_code=status.HTTP_201_CREATED)
async def connect_github_repository(
    payload: GitHubResourceCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    try:
        owner, repo = GitHubConnector.parse_github_url(payload.url)
        connector = GitHubConnector()
        repo_info = await connector.fetch_repository_info(owner, repo)
        resource_data = ResourceCreate(
            employee_id=payload.employee_id,
            project_id=payload.project_id,
            provider="GITHUB",
            resource_type="REPOSITORY",
            external_resource_id=f"{owner}/{repo}",
            external_url=repo_info.get("html_url", payload.url),
            name=f"{owner}/{repo}",
            resource_metadata={
                "owner": owner,
                "repo": repo,
                "stars": repo_info.get("stargazers_count", 0),
                "language": repo_info.get("language"),
            },
        )
        resource = await resource_service.create_resource(resource_data, db)
        background_tasks.add_task(resource_service.sync_resource_background, resource.id)
        return resource
    except Exception as exc:
        raise BadRequestException(f"Failed to connect GitHub repository: {exc}")


@router.get("/{resource_id}", response_model=ResourceOut)
async def get_resource(
    resource_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return await resource_service.get_resource(resource_id, db)


@router.post("/{resource_id}/sync")
async def sync_resource_now(
    resource_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    background_tasks.add_task(resource_service.sync_resource_background, resource_id)
    return {"message": "Resource synchronization queued", "resource_id": resource_id, "status": "SYNCING"}


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(
    resource_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    await resource_service.delete_resource(resource_id, db)
