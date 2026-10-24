from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.schemas.resource import (
    ResourceCreate, ResourceOut, GitHubResourceCreate,
    GoogleDriveFolderSelect, NotionPageSelect, JiraProjectMap
)
from app.services.resource_service import resource_service
from app.integrations.github import GitHubConnector
from app.integrations.google_drive import GoogleDriveConnector
from app.integrations.notion import NotionConnector
from app.integrations.jira import JiraConnector
from app.db.models.all_models import Admin, EmployeeResource
from app.api.dependencies import get_current_admin
from app.core.exceptions import BadRequestException

router = APIRouter(prefix="/resources", tags=["Resources"])

@router.get("", response_model=List[ResourceOut])
async def list_resources(
    employee_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    return await resource_service.list_resources(db, employee_id=employee_id, project_id=project_id, provider=provider)

@router.post("", response_model=ResourceOut, status_code=status.HTTP_201_CREATED)
async def create_resource(
    payload: ResourceCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    res = await resource_service.create_resource(payload, db)
    # Trigger sync in background
    background_tasks.add_task(resource_service.sync_resource_background, res.id)
    return res

@router.post("/github", response_model=ResourceOut, status_code=status.HTTP_201_CREATED)
async def connect_github_repository(
    payload: GitHubResourceCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Flow 2: Connect a public GitHub repository via URL."""
    try:
        owner, repo = GitHubConnector.parse_github_url(payload.url)
        github_conn = GitHubConnector()
        repo_info = await github_conn.fetch_repository_info(owner, repo)

        res_create = ResourceCreate(
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
                "language": repo_info.get("language")
            }
        )

        res = await resource_service.create_resource(res_create, db)
        background_tasks.add_task(resource_service.sync_resource_background, res.id)
        return res
    except Exception as e:
        raise BadRequestException(f"Failed to connect GitHub repository: {str(e)}")

@router.get("/gdrive/folders", response_model=List[Dict[str, Any]])
async def list_gdrive_folders(
    current_admin: Admin = Depends(get_current_admin)
):
    """Flow 3 Step 1: List Google Drive folders for admin selection."""
    drive_conn = GoogleDriveConnector()
    return await drive_conn.list_resources()

@router.post("/gdrive/select", response_model=ResourceOut, status_code=status.HTTP_201_CREATED)
async def select_gdrive_folder(
    payload: GoogleDriveFolderSelect,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Flow 3 Step 2: Confirm selection of ONE Google Drive folder."""
    res_create = ResourceCreate(
        employee_id=payload.employee_id,
        project_id=payload.project_id,
        provider="GOOGLE_DRIVE",
        resource_type="FOLDER",
        external_resource_id=payload.folder_id,
        external_url=f"https://drive.google.com/drive/folders/{payload.folder_id}",
        name=payload.folder_name,
        resource_metadata={"folder_id": payload.folder_id}
    )

    res = await resource_service.create_resource(res_create, db)
    background_tasks.add_task(resource_service.sync_resource_background, res.id)
    return res

@router.get("/notion/pages", response_model=List[Dict[str, Any]])
async def list_notion_pages(
    current_admin: Admin = Depends(get_current_admin)
):
    """Flow 4 Step 1: List accessible Notion pages for selection."""
    notion_conn = NotionConnector()
    return await notion_conn.list_resources()

@router.post("/notion/select", response_model=ResourceOut, status_code=status.HTTP_201_CREATED)
async def select_notion_page(
    payload: NotionPageSelect,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Flow 4 Step 2: Confirm selection of ONE Notion page/resource."""
    res_create = ResourceCreate(
        employee_id=payload.employee_id,
        project_id=payload.project_id,
        provider="NOTION",
        resource_type="PAGE",
        external_resource_id=payload.page_id,
        external_url=f"https://notion.so/{payload.page_id}",
        name=payload.page_title,
        resource_metadata={"page_id": payload.page_id}
    )

    res = await resource_service.create_resource(res_create, db)
    background_tasks.add_task(resource_service.sync_resource_background, res.id)
    return res

@router.get("/jira/projects", response_model=List[Dict[str, Any]])
async def list_jira_projects(
    current_admin: Admin = Depends(get_current_admin)
):
    """Flow 5 Step 1: List Jira projects in company workspace."""
    jira_conn = JiraConnector()
    return await jira_conn.list_resources()

@router.post("/jira/map", response_model=ResourceOut, status_code=status.HTTP_201_CREATED)
async def map_jira_project(
    payload: JiraProjectMap,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Flow 5 Step 2: Map Jira project to Continuum project."""
    res_create = ResourceCreate(
        employee_id=payload.employee_id,
        project_id=payload.project_id,
        provider="JIRA",
        resource_type="PROJECT_ISSUES",
        external_resource_id=payload.jira_project_key,
        external_url=f"https://continuum.atlassian.net/browse/{payload.jira_project_key}",
        name=f"Jira Project - {payload.jira_project_name}",
        resource_metadata={"jira_project_key": payload.jira_project_key}
    )

    res = await resource_service.create_resource(res_create, db)
    background_tasks.add_task(resource_service.sync_resource_background, res.id)
    return res

@router.get("/{resource_id}", response_model=ResourceOut)
async def get_resource(
    resource_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    return await resource_service.get_resource(resource_id, db)

@router.post("/{resource_id}/sync")
async def sync_resource_now(
    resource_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    background_tasks.add_task(resource_service.sync_resource_background, resource_id)
    return {"message": "Resource synchronization queued", "resource_id": resource_id, "status": "SYNCING"}

@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(
    resource_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    await resource_service.delete_resource(resource_id, db)
