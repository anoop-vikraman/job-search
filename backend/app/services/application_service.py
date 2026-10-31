import uuid
from datetime import UTC, datetime

from fastapi import status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.application import Application, Offer
from app.models.enums import ApplicationStatus, TweakStatus
from app.models.tweak import Tweak
from app.schemas.application import ApplicationCreate, CounterQuoteRequest
from app.services import wallet_service


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
    application.responded_at = datetime.now(UTC)
    tweak.status = TweakStatus.closed
    await db.commit()
    await db.refresh(application)
    return application


async def reject(
    db: AsyncSession, application_id: uuid.UUID, lister_user_id: uuid.UUID
) -> Application:
    application = await _get_application_for_owner(db, application_id, lister_user_id)
    if application.status != ApplicationStatus.pending:
        raise AppError(status.HTTP_409_CONFLICT, "INVALID_STATE", "Application is not pending.")
    application.status = ApplicationStatus.rejected
    application.responded_at = datetime.now(UTC)
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
    await db.commit()
    await db.refresh(offer)
    return offer


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
