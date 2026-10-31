import uuid
from datetime import UTC, datetime

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.application import Application
from app.models.enums import RefundStatus, TweakStatus
from app.models.refund import Refund
from app.models.tweak import Tweak
from app.schemas.refund import RefundCreate
from app.services import wallet_service


async def request_refund(db: AsyncSession, requester_id: uuid.UUID, data: RefundCreate) -> Refund:
    application = await db.get(Application, data.application_id)
    if application is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "APPLICATION_NOT_FOUND", "Application not found.")
    tweak = await db.get(Tweak, application.tweak_id)
    if tweak is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "TWEAK_NOT_FOUND", "Tweak not found.")
    if requester_id not in {tweak.created_by_user_id, application.provider_user_id}:
        raise AppError(status.HTTP_403_FORBIDDEN, "NOT_A_PARTY", "Not a party to this tweak.")

    refund = Refund(
        application_id=data.application_id,
        requested_by_user_id=requester_id,
        amount_minor=data.amount_minor,
        reason=data.reason,
    )
    db.add(refund)
    await db.commit()
    await db.refresh(refund)
    return refund


async def decide_refund(db: AsyncSession, refund_id: uuid.UUID, approve: bool) -> Refund:
    """Admin decision. Approving reverses the escrow hold to the lister."""
    refund = await db.get(Refund, refund_id)
    if refund is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "REFUND_NOT_FOUND", "Refund not found.")
    if refund.status != RefundStatus.requested:
        raise AppError(status.HTTP_409_CONFLICT, "INVALID_STATE", "Refund already decided.")

    if not approve:
        refund.status = RefundStatus.rejected
        refund.processed_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(refund)
        return refund

    application = await db.get(Application, refund.application_id)
    if application is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "APPLICATION_NOT_FOUND", "Application not found.")
    tweak = await db.get(Tweak, application.tweak_id)
    if tweak is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "TWEAK_NOT_FOUND", "Tweak not found.")

    txn = await wallet_service.refund_hold(
        db, tweak.created_by_user_id, refund.amount_minor, application_id=application.id
    )
    await db.flush()
    refund.reversing_txn_id = txn.id
    refund.status = RefundStatus.processed
    refund.processed_at = datetime.now(UTC)
    tweak.status = TweakStatus.closed
    await db.commit()
    await db.refresh(refund)
    return refund
