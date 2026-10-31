import uuid
from datetime import UTC, datetime

from fastapi import status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.models.application import Application, Offer
from app.models.enums import ApplicationStatus, NotificationType, TweakStatus
from app.models.tweak import Tweak
from app.schemas.application import ApplicationCreate, CounterQuoteRequest
from app.services import notification_service, wallet_service


def _platform_fee(amount_minor: int) -> int:
    return (amount_minor * settings.PLATFORM_FEE_BPS) // 10000


async def _get_tweak(db: AsyncSession, tweak_id: uuid.UUID) -> Tweak:
    tweak = await db.get(Tweak, tweak_id)
    if tweak is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "TWEAK_NOT_FOUND", "Tweak not found.")
    return tweak


async def apply(
    db: AsyncSession, tweak_id: uuid.UUID, provider_user_id: uuid.UUID, data: ApplicationCreate
) -> Application:
    tweak = await _get_tweak(db, tweak_id)

    if tweak.created_by_user_id == provider_user_id:
        raise AppError(
            status.HTTP_400_BAD_REQUEST,
            "CANNOT_APPLY_OWN_TWEAK",
            "You cannot apply to your own tweak.",
        )
    if tweak.status != TweakStatus.active:
        raise AppError(status.HTTP_400_BAD_REQUEST, "TWEAK_NOT_ACTIVE", "Tweak is not open.")

    existing = await db.scalar(
        select(Application).where(
            Application.tweak_id == tweak_id,
            Application.provider_user_id == provider_user_id,
            Application.status.in_([ApplicationStatus.pending, ApplicationStatus.accepted]),
        )
    )
    if existing is not None:
        raise AppError(status.HTTP_409_CONFLICT, "ALREADY_APPLIED", "You already applied.")

    application = Application(
        tweak_id=tweak_id,
        provider_user_id=provider_user_id,
        why_prefer_message=data.why_prefer_message,
        quoted_price_minor=data.quoted_price_minor,
        selected_slots=data.selected_slots,
    )
    db.add(application)
    notification_service.add(
        db,
        tweak.created_by_user_id,
        NotificationType.application_received,
        "New application",
        f'Someone applied to "{tweak.title}".',
        tweak_id=tweak.id,
    )
    await db.commit()
    await db.refresh(application)
    return application


async def accept(
    db: AsyncSession, application_id: uuid.UUID, lister_user_id: uuid.UUID
) -> Application:
    application = await _get_application_for_owner(db, application_id, lister_user_id)
    if application.status != ApplicationStatus.pending:
        raise AppError(status.HTTP_409_CONFLICT, "INVALID_STATE", "Application is not pending.")

    tweak = await _get_tweak(db, application.tweak_id)

    # Only one accepted application per tweak.
    other_accepted = await db.scalar(
        select(Application).where(
            Application.tweak_id == tweak.id,
            Application.status == ApplicationStatus.accepted,
        )
    )
    if other_accepted is not None:
        raise AppError(
            status.HTTP_409_CONFLICT, "ALREADY_ACCEPTED", "Another applicant is accepted."
        )

    agreed = _agreed_amount(application, tweak)
    await wallet_service.place_hold(
        db, lister_user_id, agreed, tweak_id=tweak.id, application_id=application.id
    )

    application.status = ApplicationStatus.accepted
    application.agreed_price_minor = agreed
    application.platform_fee_minor = _platform_fee(agreed)
    application.responded_at = datetime.now(UTC)
    # Work is now in progress; it is completed via complete().
    tweak.status = TweakStatus.in_progress
    notification_service.add(
        db,
        application.provider_user_id,
        NotificationType.application_accepted,
        "Application accepted",
        f'Your application for "{tweak.title}" was accepted.',
        tweak_id=tweak.id,
    )
    await db.commit()
    await db.refresh(application)
    return application


async def complete(
    db: AsyncSession, application_id: uuid.UUID, lister_user_id: uuid.UUID
) -> Application:
    """Lister marks the accepted work complete: releases escrow (minus platform fee)."""
    application = await _get_application_for_owner(db, application_id, lister_user_id)
    if application.status != ApplicationStatus.accepted:
        raise AppError(status.HTTP_409_CONFLICT, "INVALID_STATE", "Application is not accepted.")
    tweak = await _get_tweak(db, application.tweak_id)

    agreed = application.agreed_price_minor or _agreed_amount(application, tweak)
    fee = application.platform_fee_minor or _platform_fee(agreed)
    await wallet_service.release_hold(
        db,
        lister_user_id,
        application.provider_user_id,
        agreed,
        tweak_id=tweak.id,
        application_id=application.id,
        fee_minor=fee,
    )

    application.status = ApplicationStatus.completed
    tweak.status = TweakStatus.completed
    notification_service.add(
        db,
        application.provider_user_id,
        NotificationType.tweak_completed,
        "Payment released",
        f'"{tweak.title}" was marked complete and your payout was released.',
        tweak_id=tweak.id,
    )
    await db.commit()
    await db.refresh(application)
    return application


async def cancel(
    db: AsyncSession, application_id: uuid.UUID, lister_user_id: uuid.UUID
) -> Application:
    """Lister cancels an accepted job: refunds the escrow hold to the lister."""
    application = await _get_application_for_owner(db, application_id, lister_user_id)
    if application.status != ApplicationStatus.accepted:
        raise AppError(status.HTTP_409_CONFLICT, "INVALID_STATE", "Application is not accepted.")
    tweak = await _get_tweak(db, application.tweak_id)
    agreed = application.agreed_price_minor or _agreed_amount(application, tweak)
    await wallet_service.refund_hold(db, lister_user_id, agreed, application_id=application.id)
    application.status = ApplicationStatus.withdrawn
    tweak.status = TweakStatus.cancelled
    await db.commit()
    await db.refresh(application)
    return application


async def reject(
    db: AsyncSession, application_id: uuid.UUID, lister_user_id: uuid.UUID
) -> Application:
    application = await _get_application_for_owner(db, application_id, lister_user_id)
    if application.status != ApplicationStatus.pending:
        raise AppError(status.HTTP_409_CONFLICT, "INVALID_STATE", "Application is not pending.")
    tweak = await _get_tweak(db, application.tweak_id)
    application.status = ApplicationStatus.rejected
    application.responded_at = datetime.now(UTC)
    notification_service.add(
        db,
        application.provider_user_id,
        NotificationType.application_rejected,
        "Application declined",
        f'Your application for "{tweak.title}" was declined.',
        tweak_id=tweak.id,
    )
    await db.commit()
    await db.refresh(application)
    return application


async def counter_quote(
    db: AsyncSession,
    application_id: uuid.UUID,
    lister_user_id: uuid.UUID,
    data: CounterQuoteRequest,
) -> Offer:
    application = await _get_application_for_owner(db, application_id, lister_user_id)
    if application.status != ApplicationStatus.pending:
        raise AppError(
            status.HTTP_409_CONFLICT, "INVALID_STATE", "Can only counter a pending application."
        )
    existing = await db.scalar(select(Offer).where(Offer.application_id == application.id))
    if existing is not None:
        existing.lister_quoted_price_minor = data.lister_quoted_price_minor
        existing.message = data.message
        offer = existing
    else:
        offer = Offer(
            application_id=application.id,
            lister_quoted_price_minor=data.lister_quoted_price_minor,
            message=data.message,
        )
        db.add(offer)
    notification_service.add(
        db,
        application.provider_user_id,
        NotificationType.counter_offer,
        "Counter-offer received",
        "The lister proposed a different price.",
        tweak_id=application.tweak_id,
    )
    await db.commit()
    await db.refresh(offer)
    return offer


async def list_for_tweak(
    db: AsyncSession, tweak_id: uuid.UUID, lister_user_id: uuid.UUID
) -> list[Application]:
    tweak = await _get_tweak(db, tweak_id)
    if tweak.created_by_user_id != lister_user_id:
        raise AppError(status.HTTP_403_FORBIDDEN, "TWEAK_ACCESS_DENIED", "Not your tweak.")
    rows = (
        await db.scalars(
            select(Application)
            .where(Application.tweak_id == tweak_id)
            .order_by(Application.applied_at.desc())
        )
    ).all()
    return list(rows)


def _agreed_amount(application: Application, tweak: Tweak) -> int:
    if application.quoted_price_minor is not None:
        return application.quoted_price_minor
    if tweak.price_minor is not None:
        return tweak.price_minor
    raise AppError(status.HTTP_400_BAD_REQUEST, "NO_AGREED_PRICE", "No agreed price to escrow.")


async def _get_application_for_owner(
    db: AsyncSession, application_id: uuid.UUID, lister_user_id: uuid.UUID
) -> Application:
    application = await db.get(Application, application_id)
    if application is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "APPLICATION_NOT_FOUND", "Application not found.")
    tweak = await _get_tweak(db, application.tweak_id)
    if tweak.created_by_user_id != lister_user_id:
        raise AppError(status.HTTP_403_FORBIDDEN, "TWEAK_ACCESS_DENIED", "Not your tweak.")
    return application
