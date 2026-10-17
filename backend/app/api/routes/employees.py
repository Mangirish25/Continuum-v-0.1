from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeOut
from app.services.employee_service import employee_service
from app.db.models.all_models import Admin
from app.api.dependencies import get_current_admin

router = APIRouter(prefix="/employees", tags=["Employees"])

@router.get("", response_model=List[EmployeeOut])
async def list_employees(
    search: Optional[str] = Query(None, description="Search by name, email, or role"),
    team: Optional[str] = Query(None, description="Filter by team"),
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE, LEAVING, INACTIVE)"),
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    return await employee_service.list_employees(db, search=search, team=team, status=status, skip=skip, limit=limit)

@router.post("", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
async def create_employee(
    payload: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    return await employee_service.create_employee(payload, db)

@router.get("/{employee_id}", response_model=EmployeeOut)
async def get_employee(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    return await employee_service.get_employee_detail(employee_id, db)

@router.patch("/{employee_id}", response_model=EmployeeOut)
async def update_employee(
    employee_id: str,
    payload: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    return await employee_service.update_employee(employee_id, payload, db)

@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    await employee_service.delete_employee(employee_id, db)
