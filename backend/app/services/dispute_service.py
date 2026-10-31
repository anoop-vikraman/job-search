"""Disputes over accepted work. Opening one freezes escrow (application -> `disputed`);
an admin resolves it by releasing, refunding, or splitting the held amount."""

import uuid
from datetime import UTC, datetime

from fastapi import status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.application import Application
from app.models.dispute import Dispute
from app.models.enums import (
    ApplicationStatus,
    DisputeOutcome,
    DisputeStatus,
    NotificationType,
    TweakStatus,
)
from app.models.tweak import Tweak
from app.schemas.dispute import DisputeCreate, DisputeResolve
from app.services import (
    analytics_service,
    application_service,
    notification_service,
    wallet_service,
)


async def _application_and_tweak(
    db: AsyncSession, application_id: uuid.UUID
) -> tuple[Application, Tweak]:
    application = await db.scalar(
        select(Application).where(Application.id == application_id).with_for_update()
    )
    if application is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "APPLICATION_NOT_FOUND", "Application not found.")
    tweak = await db.get(Tweak, application.tweak_id)
    if tweak is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "TWEAK_NOT_FOUND", "Tweak not found.")
    return application, tweak


async def open_dispute(
    db: AsyncSession, application_id: uuid.UUID, user_id: uuid.UUID, data: DisputeCreate
) -> Dispute:
    application, tweak = await _application_and_tweak(db, application_id)
    parties = {tweak.created_by_user_id, application.provider_user_id}
    if user_id not in parties:
        raise AppError(
            status.HTTP_403_FORBIDDEN, "NOT_A_PARTY", "Only the lister or provider can dispute."
        )
    if application.status != ApplicationStatus.accepted:
        raise AppError(
            status.HTTP_409_CONFLICT,
            "INVALID_STATE",
            "Only accepted, unfinished work can be disputed.",
        )
    dispute = Dispute(
        application_id=application.id,
        opened_by_user_id=user_id,
        reason=data.reason,
        evidence=[{"url": url} for url in data.evidence_urls],
    )
    db.add(dispute)
    application.status = ApplicationStatus.disputed
    application.auto_release_at = None  # the pending auto-release job becomes a no-op
    analytics_service.track(db, "dispute_opened", user_id=user_id, tweak_id=tweak.id)
    other = (parties - {user_id}).pop()
    notification_service.add(
        db,
        other,
        NotificationType.dispute_opened,
        "A dispute was opened",
        f'Payment for "{tweak.title}" is on hold while Tweak support reviews it.',
        tweak_id=tweak.id,
    )
    await db.commit()
    await db.refresh(dispute)
    return dispute


async def get_for_application(
    db: AsyncSession, application_id: uuid.UUID, user_id: uuid.UUID
) -> Dispute:
    """Latest dispute on an application, for its parties."""
    application = await db.get(Application, application_id)
    tweak = await db.get(Tweak, application.tweak_id) if application else None
    if (
        application is None
        or tweak is None
        or user_id
        not in {
            tweak.created_by_user_id,
            application.provider_user_id,
        }
    ):
        raise AppError(status.HTTP_404_NOT_FOUND, "DISPUTE_NOT_FOUND", "Dispute not found.")
    dispute = await db.scalar(
        select(Dispute)
        .where(Dispute.application_id == application_id)
        .order_by(Dispute.created_at.desc())
        .limit(1)
    )
    if dispute is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "DISPUTE_NOT_FOUND", "Dispute not found.")
    return dispute


async def list_disputes(
    db: AsyncSession, *, status_filter: DisputeStatus | None, page: int, limit: int
) -> tuple[list[Dispute], int]:
    conditions = [Dispute.status == status_filter] if status_filter else []
    total = (await db.scalar(select(func.count()).select_from(Dispute).where(*conditions))) or 0
    rows = (
        await db.scalars(
            select(Dispute)
            .where(*conditions)
            .order_by(Dispute.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    return list(rows), total


async def resolve_dispute(
    db: AsyncSession, dispute_id: uuid.UUID, admin_id: uuid.UUID, data: DisputeResolve
) -> Dispute:
    dispute = await db.scalar(select(Dispute).where(Dispute.id == dispute_id).with_for_update())
    if dispute is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "DISPUTE_NOT_FOUND", "Dispute not found.")
    if dispute.status != DisputeStatus.open:
        raise AppError(status.HTTP_409_CONFLICT, "INVALID_STATE", "Dispute already resolved.")
    application, tweak = await _application_and_tweak(db, dispute.application_id)
    if application.status != ApplicationStatus.disputed:
        raise AppError(status.HTTP_409_CONFLICT, "INVALID_STATE", "Application is not disputed.")
    held = application.agreed_price_minor or application_service._agreed_amount(application, tweak)

    if data.outcome == DisputeOutcome.release:
        await application_service.release_to_provider(
            db, application, tweak, reason="was settled in your favour by Tweak support"
        )
        provider_minor = held
    elif data.outcome == DisputeOutcome.refund:
        await wallet_service.refund_hold(
            db, tweak.created_by_user_id, held, application_id=application.id
        )
        application.status = ApplicationStatus.withdrawn
        tweak.status = TweakStatus.cancelled
        provider_minor = 0
    else:
        provider_minor = data.provider_amount_minor or 0
        if not 0 < provider_minor < held:
            raise AppError(
                status.HTTP_400_BAD_REQUEST,
                "INVALID_SPLIT",
                f"A partial settlement gives the provider 1 to {held - 1} (minor units).",
            )
        await wallet_service.split_hold(
            db,
            tweak.created_by_user_id,
            application.provider_user_id,
            held,
            provider_minor,
            tweak_id=tweak.id,
            application_id=application.id,
            fee_minor=application_service._platform_fee(provider_minor),
        )
        application.status = ApplicationStatus.completed
        tweak.status = TweakStatus.completed

    dispute.status = DisputeStatus.resolved
    dispute.outcome = data.outcome
    dispute.provider_amount_minor = provider_minor
    dispute.admin_note = data.note
    dispute.resolved_by_user_id = admin_id
    dispute.resolved_at = datetime.now(UTC)
    summary = {
        DisputeOutcome.release: "the payment was released to the provider",
        DisputeOutcome.refund: "the payment was refunded to the lister",
        DisputeOutcome.partial: "the payment was split between both sides",
    }[data.outcome]
    for user_id in (tweak.created_by_user_id, application.provider_user_id):
        notification_service.add(
            db,
            user_id,
            NotificationType.dispute_resolved,
            "Dispute resolved",
            f'For "{tweak.title}", {summary}.' + (f" Note: {data.note}" if data.note else ""),
            tweak_id=tweak.id,
        )
    await db.commit()
    await db.refresh(dispute)
    return dispute
