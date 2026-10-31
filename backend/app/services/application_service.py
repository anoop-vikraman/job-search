import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.models.application import Application, Offer
from app.models.enums import ApplicationStatus, NotificationType, TweakStatus
from app.models.tweak import Tweak
from app.models.user import User
from app.schemas.application import ApplicationCreate, CounterQuoteRequest, WorkSubmit
from app.services import block_service, job_service, notification_service, wallet_service


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
    await block_service.ensure_not_blocked(db, provider_user_id, tweak.created_by_user_id)

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
            Application.status.in_([ApplicationStatus.accepted, ApplicationStatus.disputed]),
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
    """Lister confirms the accepted work: releases escrow (minus platform fee)."""
    application = await _get_application_for_owner(db, application_id, lister_user_id)
    if application.status != ApplicationStatus.accepted:
        raise AppError(status.HTTP_409_CONFLICT, "INVALID_STATE", "Application is not accepted.")
    tweak = await _get_tweak(db, application.tweak_id)
    await release_to_provider(db, application, tweak, reason="was marked complete")
    await db.commit()
    await db.refresh(application)
    return application


async def release_to_provider(
    db: AsyncSession, application: Application, tweak: Tweak, *, reason: str
) -> None:
    """Pay the full escrow to the provider (minus fee) and close the job. Caller commits."""
    agreed = application.agreed_price_minor or _agreed_amount(application, tweak)
    fee = application.platform_fee_minor or _platform_fee(agreed)
    await wallet_service.release_hold(
        db,
        tweak.created_by_user_id,
        application.provider_user_id,
        agreed,
        tweak_id=tweak.id,
        application_id=application.id,
        fee_minor=fee,
    )
    application.status = ApplicationStatus.completed
    application.auto_release_at = None
    tweak.status = TweakStatus.completed
    notification_service.add(
        db,
        application.provider_user_id,
        NotificationType.tweak_completed,
        "Payment released",
        f'"{tweak.title}" {reason} and your payout was released.',
        tweak_id=tweak.id,
    )
    for hook in COMPLETION_HOOKS:
        await hook(db, tweak, application)


# Follow-ups run inside the completing transaction (e.g. recurring tweaks re-post).
COMPLETION_HOOKS: list[Callable[[AsyncSession, Tweak, Application], Awaitable[None]]] = []


async def submit_work(
    db: AsyncSession, application_id: uuid.UUID, provider_user_id: uuid.UUID, data: WorkSubmit
) -> Application:
    """Provider marks the job done. The lister then confirms or disputes; otherwise the
    escrow releases automatically after AUTO_RELEASE_HOURS."""
    application = await db.get(Application, application_id)
    if application is None or application.provider_user_id != provider_user_id:
        raise AppError(status.HTTP_404_NOT_FOUND, "APPLICATION_NOT_FOUND", "Application not found.")
    if application.status != ApplicationStatus.accepted:
        raise AppError(status.HTTP_409_CONFLICT, "INVALID_STATE", "Application is not accepted.")
    tweak = await _get_tweak(db, application.tweak_id)
    now = datetime.now(UTC)
    application.work_submitted_at = now
    application.completion_note = data.note
    application.completion_photos = [{"url": url} for url in data.photo_urls]
    application.auto_release_at = now + timedelta(hours=settings.AUTO_RELEASE_HOURS)
    job_service.enqueue(
        db,
        "auto_release",
        {"application_id": str(application.id)},
        run_at=application.auto_release_at,
    )
    notification_service.add(
        db,
        tweak.created_by_user_id,
        NotificationType.work_submitted,
        "Work marked as done",
        f'The provider finished "{tweak.title}". Confirm it or open a dispute within '
        f"{settings.AUTO_RELEASE_HOURS} hours; otherwise payment releases automatically.",
        tweak_id=tweak.id,
    )
    await db.commit()
    await db.refresh(application)
    return application


@job_service.handler("auto_release")
async def auto_release_job(db: AsyncSession, payload: dict[str, Any]) -> None:
    """Release escrow if the lister neither confirmed nor disputed in time."""
    application = await db.scalar(
        select(Application)
        .where(Application.id == uuid.UUID(payload["application_id"]))
        .with_for_update()
    )
    if (
        application is None
        or application.status != ApplicationStatus.accepted
        or application.auto_release_at is None
        or application.auto_release_at > datetime.now(UTC)
    ):
        await db.commit()
        return  # confirmed, disputed, cancelled or resubmitted since: nothing to do
    tweak = await _get_tweak(db, application.tweak_id)
    await release_to_provider(
        db, application, tweak, reason="was auto-confirmed after the review window"
    )
    notification_service.add(
        db,
        tweak.created_by_user_id,
        NotificationType.tweak_completed,
        "Payment released automatically",
        f'No response on "{tweak.title}" within the review window, so the payment was released.',
        tweak_id=tweak.id,
    )
    await db.commit()


async def cancel(
    db: AsyncSession, application_id: uuid.UUID, lister_user_id: uuid.UUID
) -> Application:
    """Lister cancels an accepted job: refunds the escrow hold to the lister.

    Not allowed once the provider has marked the work done; that needs a dispute.
    """
    application = await _get_application_for_owner(db, application_id, lister_user_id)
    if application.status != ApplicationStatus.accepted:
        raise AppError(status.HTTP_409_CONFLICT, "INVALID_STATE", "Application is not accepted.")
    if application.work_submitted_at is not None:
        raise AppError(
            status.HTTP_409_CONFLICT,
            "WORK_SUBMITTED",
            "The provider marked this work done. Open a dispute instead of cancelling.",
        )
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


async def list_for_tweak_detailed(
    db: AsyncSession, tweak_id: uuid.UUID, lister_user_id: uuid.UUID
) -> list[tuple[Application, User, Offer | None]]:
    """Applications for a tweak, each with the provider's profile and any counter-offer."""
    tweak = await _get_tweak(db, tweak_id)
    if tweak.created_by_user_id != lister_user_id:
        raise AppError(status.HTTP_403_FORBIDDEN, "TWEAK_ACCESS_DENIED", "Not your tweak.")
    rows = (
        await db.execute(
            select(Application, User, Offer)
            .join(User, User.id == Application.provider_user_id)
            .outerjoin(Offer, Offer.application_id == Application.id)
            .where(Application.tweak_id == tweak_id)
            .order_by(Application.applied_at.desc())
        )
    ).all()
    return [(a, u, o) for a, u, o in rows]


async def list_for_provider(
    db: AsyncSession, provider_user_id: uuid.UUID
) -> list[tuple[Application, Tweak, Offer | None]]:
    """Applications the given provider submitted, with the tweak's headline and any
    counter-offer from the lister."""
    rows = (
        await db.execute(
            select(Application, Tweak, Offer)
            .join(Tweak, Tweak.id == Application.tweak_id)
            .outerjoin(Offer, Offer.application_id == Application.id)
            .where(Application.provider_user_id == provider_user_id)
            .order_by(Application.applied_at.desc())
        )
    ).all()
    return [(a, t, o) for a, t, o in rows]


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
