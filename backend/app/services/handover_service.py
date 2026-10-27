from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.models.all_models import Handover, Employee, Project, KnowledgeDocument, EmployeeResource, HandoverAuditLog, Admin
from app.schemas.handover import HandoverCreate, HandoverOut, HandoverSendRequest, HandoverReverseRequest
from app.ai.handover_generator import handover_generator
from app.services.email_service import email_service
from app.core.exceptions import NotFoundException, BadRequestException, ConflictException
from app.core.logging import logger

# Statuses that can be legally reversed
REVERSIBLE_STATUSES = {"READY_FOR_REVIEW", "SENT"}


class HandoverService:
    async def generate_handover(
        self,
        data: HandoverCreate,
        db: AsyncSession
    ) -> HandoverOut:
        # Fetch employee
        emp_stmt = select(Employee).where(Employee.id == data.employee_id).options(selectinload(Employee.projects))
        emp = (await db.execute(emp_stmt)).scalar_one_or_none()
        if not emp:
            raise NotFoundException(f"Employee {data.employee_id} not found.")

        # Target project
        target_project = None
        if data.project_id:
            proj_stmt = select(Project).where(Project.id == data.project_id)
            target_project = (await db.execute(proj_stmt)).scalar_one_or_none()
        elif emp.projects:
            target_project = emp.projects[0]

        recipient_email = data.recipient_email or emp.email

        # Create Handover in DRAFT / GENERATING state
        handover = Handover(
            employee_id=emp.id,
            project_id=target_project.id if target_project else None,
            status="GENERATING",
            recipient_email=recipient_email
        )
        db.add(handover)
        await db.commit()
        await db.refresh(handover)

        try:
            # Gather relevant documents for employee
            doc_stmt = select(KnowledgeDocument).where(KnowledgeDocument.employee_id == emp.id)
            if target_project:
                doc_stmt = doc_stmt.where(KnowledgeDocument.project_id == target_project.id)
            documents = (await db.execute(doc_stmt)).scalars().all()

            # Gather resources
            res_stmt = select(EmployeeResource).where(EmployeeResource.employee_id == emp.id)
            resources = (await db.execute(res_stmt)).scalars().all()

            # Gather candidate successors
            cand_stmt = select(Employee).where(Employee.status == "ACTIVE", Employee.id != emp.id)
            candidate_successors = (await db.execute(cand_stmt)).scalars().all()

            # Generate handover package via AI
            package = await handover_generator.generate_handover_package(
                employee=emp,
                project=target_project,
                candidate_successors=candidate_successors,
                documents=documents,
                resources=resources,
                db=db
            )

            # Update Handover object
            handover.status = "READY_FOR_REVIEW"
            handover.generated_summary = package.summary
            handover.knowledge_package = package.model_dump()
            if package.recommended_successor:
                handover.recommended_successor_id = package.recommended_successor.employee_id

            await db.commit()
            logger.info(f"Handover {handover.id} generated successfully for employee {emp.name}")

        except Exception as e:
            logger.error(f"Failed to generate handover {handover.id}: {e}")
            handover.status = "FAILED"
            await db.commit()
            raise BadRequestException(f"Handover generation failed: {str(e)}")

        return await self.get_handover_detail(handover.id, db)

    async def get_handover_detail(self, handover_id: str, db: AsyncSession) -> HandoverOut:
        stmt = (
            select(Handover)
            .where(Handover.id == handover_id)
            .options(
                selectinload(Handover.employee),
                selectinload(Handover.project),
                selectinload(Handover.recommended_successor)
            )
        )
        res = await db.execute(stmt)
        h = res.scalar_one_or_none()
        if not h:
            raise NotFoundException(f"Handover {handover_id} not found.")

        succ_info = {
            "id": h.recommended_successor.id,
            "name": h.recommended_successor.name,
            "email": h.recommended_successor.email,
            "role": h.recommended_successor.role,
        } if h.recommended_successor else None

        return HandoverOut(
            id=h.id,
            employee_id=h.employee_id,
            employee_name=h.employee.name if h.employee else None,
            employee_email=h.employee.email if h.employee else None,
            project_id=h.project_id,
            project_name=h.project.name if h.project else None,
            status=h.status,
            generated_summary=h.generated_summary,
            knowledge_package=h.knowledge_package,
            recommended_successor_id=h.recommended_successor_id,
            recommended_successor=succ_info,
            risk_summary=h.risk_summary or {},
            recipient_email=h.recipient_email,
            sent_at=h.sent_at,
            reversed_at=h.reversed_at,
            reversal_reason=h.reversal_reason,
            created_at=h.created_at,
            updated_at=h.updated_at
        )

    async def list_handovers(self, db: AsyncSession) -> List[HandoverOut]:
        stmt = select(Handover)
        handovers = (await db.execute(stmt)).scalars().all()
        output = []
        for h in handovers:
            detail = await self.get_handover_detail(h.id, db)
            output.append(detail)
        return output

    async def send_handover(
        self,
        handover_id: str,
        data: HandoverSendRequest,
        db: AsyncSession
    ) -> HandoverOut:
        stmt = select(Handover).where(Handover.id == handover_id).options(selectinload(Handover.employee), selectinload(Handover.project))
        h = (await db.execute(stmt)).scalar_one_or_none()

        if not h:
            raise NotFoundException(f"Handover {handover_id} not found.")

        if h.status not in ["READY_FOR_REVIEW", "SENT"]:
            raise BadRequestException(f"Handover status is '{h.status}'. Must be 'READY_FOR_REVIEW' before sending.")

        target_recipient = data.recipient_email or h.recipient_email or h.employee.email

        # Send Email
        try:
            success = await email_service.send_handover_email(
                recipient_email=target_recipient,
                employee_name=h.employee.name,
                project_name=h.project.name if h.project else "General Handover",
                handover_package=h.knowledge_package or {},
                recipient_name=data.recipient_name,
                cc_recipients=[str(data.cc_email)] if data.cc_email else None,
            )
        except Exception as e:
            logger.error(f"Email dispatch failed for handover {h.id}: {e}")
            raise BadRequestException(f"Failed to dispatch handover email: {e}") from e

        if not success:
            raise BadRequestException("Failed to dispatch handover email.")

        h.status = "SENT"
        h.recipient_email = target_recipient
        h.sent_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await db.commit()

        logger.info(f"Handover {h.id} status updated to SENT")
        return await self.get_handover_detail(h.id, db)

    async def reverse_handover(
        self,
        handover_id: str,
        data: HandoverReverseRequest,
        admin: Admin,
        db: AsyncSession,
    ) -> HandoverOut:
        """
        Reverse (take back) a previously generated or sent handover.

        Business rules:
        - The handover must exist.
        - Only READY_FOR_REVIEW or SENT handovers may be reversed.
        - An already-REVERSED handover is rejected (idempotency guard).
        - The reversal reason must be non-empty (enforced by Pydantic schema).
        - All changes are committed in a single transaction together with the
          immutable audit log entry so they stay consistent.
        """
        # Use SELECT ... FOR UPDATE on PostgreSQL to prevent concurrent reversal attempts.
        # SQLite (used in tests) silently ignores FOR UPDATE, which is acceptable since
        # SQLite serialises writes at the connection level anyway.
        stmt = (
            select(Handover)
            .where(Handover.id == handover_id)
            .options(
                selectinload(Handover.employee),
                selectinload(Handover.project),
            )
            .with_for_update()
        )
        h = (await db.execute(stmt)).scalar_one_or_none()

        if not h:
            raise NotFoundException(f"Handover '{handover_id}' not found.")

        if h.status == "REVERSED":
            raise ConflictException(
                f"Handover '{handover_id}' has already been reversed and cannot be reversed again."
            )

        if h.status not in REVERSIBLE_STATUSES:
            raise BadRequestException(
                f"Handover cannot be reversed from status '{h.status}'. "
                f"Only {sorted(REVERSIBLE_STATUSES)} handovers may be taken back."
            )

        reason = data.reason.strip()
        if not reason:
            raise BadRequestException("A non-empty reversal reason is required.")

        previous_status = h.status
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        # Apply reversal
        h.status = "REVERSED"
        h.reversed_at = now
        h.reversal_reason = reason

        # Write immutable audit entry
        audit = HandoverAuditLog(
            handover_id=h.id,
            admin_id=admin.id,
            action="REVERSED",
            previous_status=previous_status,
            new_status="REVERSED",
            reason=reason,
            audit_metadata={
                "reversed_by_email": admin.email,
                "reversed_by_name": admin.name,
                "employee_id": h.employee_id,
                "employee_name": h.employee.name if h.employee else None,
                "project_id": h.project_id,
                "project_name": h.project.name if h.project else None,
            },
        )
        db.add(audit)

        # Commit both atomically
        await db.commit()

        logger.info(
            f"Handover {h.id} reversed by admin {admin.email} "
            f"(previous status: {previous_status}). Reason: {reason}"
        )

        return await self.get_handover_detail(h.id, db)


handover_service = HandoverService()
