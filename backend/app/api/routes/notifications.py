from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.schemas.notification import NotificationOut
from app.db.models.all_models import Notification, Admin
from app.api.dependencies import get_current_admin
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationOut])
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    stmt = select(Notification).order_by(Notification.created_at.desc()).limit(20)
    return (await db.execute(stmt)).scalars().all()

@router.patch("/{notification_id}/read", response_model=NotificationOut)
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    stmt = select(Notification).where(Notification.id == notification_id)
    n = (await db.execute(stmt)).scalar_one_or_none()
    if not n:
        raise NotFoundException(f"Notification {notification_id} not found.")
    n.read = True
    await db.commit()
    return n
