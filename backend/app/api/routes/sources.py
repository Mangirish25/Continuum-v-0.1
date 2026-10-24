import re
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.schemas.source import SourceCreate, SourceUpdate, SourceOut, SourceSyncResponse
from app.db.models.all_models import (
    Admin, EmployeeResource, Project, Employee, OAuthConnection
)
from app.api.dependencies import get_current_admin
from app.services.resource_service import resource_service
from app.integrations.github import GitHubConnector
from app.core.config import settings
from app.core.exceptions import BadRequestException, NotFoundException, ConflictException
from app.core.logging import logger

router = APIRouter(prefix="/sources", tags=["Sources"])

def parse_source_input(source_type: str, url: Optional[str], external_id: Optional[str]) -> tuple[str, str, str]:
    """
    Normalize and validate resource input based on source type.
    Returns: (normalized_provider, resource_type, external_resource_id)
    """
    st = source_type.upper().replace("-", "_").replace(" ", "_")
    if st in ["GITHUB", "GIT"]:
        prov = "GITHUB"
        res_type = "REPOSITORY"
        target = url or external_id
        if not target:
            raise BadRequestException("A valid GitHub repository URL (e.g., https://github.com/owner/repo) is required.")
        try:
            owner, repo = GitHubConnector.parse_github_url(target)
        except ValueError as e:
            raise BadRequestException(f"Invalid GitHub URL or repository format: {e}")
        ext_id = f"{owner}/{repo}"
        norm_url = f"https://github.com/{owner}/{repo}"
    elif st in ["GOOGLE_DRIVE", "GOOGLEDRIVE", "GDRIVE", "DRIVE", "GOOGLE"]:
        prov = "GOOGLE_DRIVE"
        res_type = "FOLDER"
        target = external_id or url
        if not target:
            raise BadRequestException("A Google Drive folder ID or folder URL is required.")
        # Extract folder ID if URL was passed
        folder_match = re.search(r"folders/([a-zA-Z0-9_-]+)", target)
        if folder_match:
            ext_id = folder_match.group(1)
        else:
            ext_id = target.strip().rstrip("/")
        norm_url = f"https://drive.google.com/drive/folders/{ext_id}"
    elif st in ["NOTION", "NOTION_PAGE"]:
        prov = "NOTION"
        res_type = "PAGE"
        target = external_id or url
        if not target:
            raise BadRequestException("A Notion page ID or page URL is required.")
        # Extract page ID from notion.so URL if passed
        notion_match = re.search(r"([0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})", target)
        if notion_match:
            ext_id = notion_match.group(1)
        else:
            ext_id = target.strip().rstrip("/").split("/")[-1]
        norm_url = f"https://notion.so/{ext_id}"
    elif st in ["JIRA", "ATLASSIAN"]:
        prov = "JIRA"
        res_type = "PROJECT_ISSUES"
        target = external_id or url
        if not target:
            raise BadRequestException("A Jira project key (e.g., PAY, AUTH) or project URL is required.")
        # Extract project key if URL
        jira_match = re.search(r"browse/([A-Z0-9]+)", target)
        if jira_match:
            ext_id = jira_match.group(1)
        else:
            ext_id = target.strip().split("/")[-1].upper()
        norm_url = f"https://continuum.atlassian.net/browse/{ext_id}"
    else:
        raise BadRequestException(f"Unsupported source type '{source_type}'. Supported: GITHUB, GOOGLE_DRIVE, NOTION, JIRA.")

    return prov, res_type, ext_id, norm_url

async def format_source_out(res: EmployeeResource, db: AsyncSession) -> SourceOut:
    project_name = None
    if res.project_id:
        proj_stmt = select(Project.name).where(Project.id == res.project_id)
        project_name = (await db.execute(proj_stmt)).scalar()

    employee_name = None
    if res.employee_id:
        emp_stmt = select(Employee.name).where(Employee.id == res.employee_id)
        employee_name = (await db.execute(emp_stmt)).scalar()

    return SourceOut(
        id=res.id,
        source_type=res.provider.lower(),
        name=res.name,
        url=res.external_url,
        external_resource_id=res.external_resource_id,
        project_id=res.project_id,
        project_name=project_name,
        employee_id=res.employee_id,
        employee_name=employee_name,
        status=res.status,
        last_synced_at=res.last_synced_at,
        last_successful_sync_at=res.last_successful_sync_at,
        last_sync_error=res.last_sync_error,
        resource_metadata=res.resource_metadata or {},
        created_at=res.created_at,
        updated_at=res.updated_at
    )

@router.get("", response_model=List[SourceOut])
async def list_sources(
    provider: Optional[str] = Query(None, description="Filter by provider"),
    status: Optional[str] = Query(None, description="Filter by status"),
    project_id: Optional[str] = Query(None, description="Filter by project"),
    employee_id: Optional[str] = Query(None, description="Filter by employee"),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    List all registered knowledge sources with their synchronization status and metadata.
    """
    stmt = select(EmployeeResource)
    if provider:
        stmt = stmt.where(EmployeeResource.provider == provider.upper())
    if status:
        stmt = stmt.where(EmployeeResource.status == status.upper())
    if project_id:
        stmt = stmt.where(EmployeeResource.project_id == project_id)
    if employee_id:
        stmt = stmt.where(EmployeeResource.employee_id == employee_id)

    resources = (await db.execute(stmt)).scalars().all()
    results = []
    for r in resources:
        results.append(await format_source_out(r, db))
    return results

@router.post("", response_model=SourceOut, status_code=status.HTTP_201_CREATED)
async def register_source(
    payload: SourceCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Manually register a new knowledge source (GitHub, Google Drive, Notion, Jira) in PostgreSQL.
    """
    prov, res_type, ext_id, norm_url = parse_source_input(
        payload.source_type, payload.url, payload.external_resource_id
    )

    # Check duplicate
    stmt = select(EmployeeResource).where(
        EmployeeResource.provider == prov,
        EmployeeResource.external_resource_id == ext_id
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        if existing.status == "DISABLED":
            existing.status = "READY"
            existing.name = payload.name or existing.name
            await db.commit()
            return await format_source_out(existing, db)
        raise ConflictException(f"Knowledge source '{ext_id}' ({prov}) is already registered.")

    # Determine initial status based on provider authentication
    init_status = "READY"
    if prov in ["GOOGLE_DRIVE", "NOTION", "JIRA"]:
        conn_stmt = select(OAuthConnection).where(OAuthConnection.provider == prov)
        conn = (await db.execute(conn_stmt)).scalar_one_or_none()
        if not conn:
            init_status = "NEEDS_AUTH"

    # Validate Project ID if provided
    if payload.project_id:
        p_res = (await db.execute(select(Project).where(Project.id == payload.project_id))).scalar_one_or_none()
        if not p_res:
            raise BadRequestException(f"Project with ID '{payload.project_id}' does not exist.")

    # Validate Employee ID if provided
    if payload.employee_id:
        e_res = (await db.execute(select(Employee).where(Employee.id == payload.employee_id))).scalar_one_or_none()
        if not e_res:
            raise BadRequestException(f"Employee with ID '{payload.employee_id}' does not exist.")

    resource = EmployeeResource(
        name=payload.name,
        provider=prov,
        resource_type=res_type,
        external_resource_id=ext_id,
        external_url=payload.url or norm_url,
        project_id=payload.project_id,
        employee_id=payload.employee_id,
        resource_metadata=payload.resource_metadata or {},
        status=init_status
    )
    db.add(resource)
    await db.commit()
    await db.refresh(resource)

    # Trigger automatic sync in background if source is ready and not in test environment
    if init_status == "READY" and settings.ENVIRONMENT != "testing":
        background_tasks.add_task(resource_service.sync_resource_background, resource.id)

    logger.info(f"Administrator {current_admin.email} registered new {prov} source: {resource.name} ({ext_id})")
    return await format_source_out(resource, db)

@router.get("/{source_id}", response_model=SourceOut)
async def get_source(
    source_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Get registered knowledge source detail by ID.
    """
    res = await resource_service.get_resource(source_id, db)
    return await format_source_out(res, db)

@router.patch("/{source_id}", response_model=SourceOut)
async def update_source(
    source_id: str,
    payload: SourceUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Update knowledge source metadata, associations, or status.
    """
    res = await resource_service.get_resource(source_id, db)

    if payload.name is not None:
        res.name = payload.name
    if payload.url is not None:
        res.external_url = payload.url
    if payload.project_id is not None:
        res.project_id = payload.project_id
    if payload.employee_id is not None:
        res.employee_id = payload.employee_id
    if payload.status is not None:
        res.status = payload.status.upper()
    if payload.resource_metadata is not None:
        res.resource_metadata = {**(res.resource_metadata or {}), **payload.resource_metadata}

    await db.commit()
    await db.refresh(res)
    return await format_source_out(res, db)

@router.delete("/{source_id}")
async def delete_source(
    source_id: str,
    hard_delete: bool = Query(False, description="Set true to permanently delete associated documents"),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Disable or permanently remove a registered knowledge source.
    """
    res = await resource_service.get_resource(source_id, db)

    if hard_delete:
        await resource_service.delete_resource(source_id, db)
        return {"message": "Knowledge source permanently deleted.", "source_id": source_id, "status": "DELETED"}
    else:
        # Safe deactivation (reversible)
        res.status = "DISABLED"
        await db.commit()
        return {"message": "Knowledge source successfully disabled.", "source_id": source_id, "status": "DISABLED"}

@router.post("/{source_id}/sync", response_model=SourceSyncResponse)
async def sync_source(
    source_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """
    Trigger manual knowledge synchronization for a registered source.
    """
    res = await resource_service.get_resource(source_id, db)
    background_tasks.add_task(resource_service.sync_resource_background, source_id)
    return SourceSyncResponse(
        source_id=source_id,
        status="SYNCING",
        message=f"Synchronization queued for source '{res.name}'"
    )
