from typing import List
from fastapi import APIRouter, Depends, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.schemas.handover import HandoverCreate, HandoverOut, HandoverSendRequest
from app.services.handover_service import handover_service
from app.db.models.all_models import Admin
from app.api.dependencies import get_current_admin

router = APIRouter(prefix="/handovers", tags=["Handovers"])

@router.get("", response_model=List[HandoverOut])
async def list_handovers(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    return await handover_service.list_handovers(db)

@router.post("", response_model=HandoverOut, status_code=status.HTTP_201_CREATED)
async def create_handover_job(
    payload: HandoverCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Flow 8 Step 1: Initiate handover package generation for an outgoing employee."""
    return await handover_service.generate_handover(payload, db)

@router.get("/{handover_id}", response_model=HandoverOut)
async def get_handover_review(
    handover_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Flow 8 Step 2: Review generated handover package, knowledge summary, and recommended successor."""
    return await handover_service.get_handover_detail(handover_id, db)

@router.post("/{handover_id}/send", response_model=HandoverOut)
async def confirm_and_send_handover(
    handover_id: str,
    payload: HandoverSendRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Flow 8 Step 3: Admin explicit confirmation step to dispatch handover email report."""
    return await handover_service.send_handover(handover_id, payload, db)
