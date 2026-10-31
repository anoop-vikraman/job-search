import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.enums import (
    ApplicationStatus,
    PricingModel,
    RefundStatus,
    TweakStatus,
    TweakType,
)
from app.models.tweak import Tweak
from app.schemas.application import ApplicationCreate
from app.schemas.rating import RatingCreate
from app.schemas.refund import RefundCreate
from app.services import application_service, rating_service, refund_service, wallet_service
from tests.conftest import make_user


async def _completed_job(db: AsyncSession):
    """Set up a completed job: returns (lister, provider, tweak, application)."""
    lister = await make_user(db, balance_minor=200000)
    provider = await make_user(db)
    tweak = Tweak(
        created_by_user_id=lister.id,
        title="Job",
        description="d",
        category="Plumbing",
        tweak_type=TweakType.in_person,
        status=TweakStatus.active,
        pricing_model=PricingModel.fixed,
        pricing_data={"amount_minor": 100000},
        price_minor=100000,
        currency="INR",
    )
    db.add(tweak)
    await db.flush()
    app = await application_service.apply(
        db, tweak.id, provider.id, ApplicationCreate(quoted_price_minor=100000)
    )
    await application_service.accept(db, app.id, lister.id)
    return lister, provider, tweak, app


# ---- Refunds ----

async def test_request_refund_requires_party(db: AsyncSession) -> None:
    lister, provider, tweak, app = await _completed_job(db)
    stranger = await make_user(db)
    with pytest.raises(AppError) as exc:
        await refund_service.request_refund(
            db, stranger.id, RefundCreate(application_id=app.id, amount_minor=100000)
        )
    assert exc.value.code == "NOT_A_PARTY"


async def test_approve_refund_reverses_hold(db: AsyncSession) -> None:
    lister, provider, tweak, app = await _completed_job(db)
    refund = await refund_service.request_refund(
        db, lister.id, RefundCreate(application_id=app.id, amount_minor=100000)
    )
    decided = await refund_service.decide_refund(db, refund.id, approve=True)
    assert decided.status == RefundStatus.processed
    lister_w = await wallet_service.get_or_create_wallet(db, lister.id)
    assert lister_w.held_minor == 0
    assert lister_w.balance_minor == 200000  # hold returned


async def test_reject_refund_keeps_hold(db: AsyncSession) -> None:
    lister, provider, tweak, app = await _completed_job(db)
    refund = await refund_service.request_refund(
        db, lister.id, RefundCreate(application_id=app.id, amount_minor=100000)
    )
    decided = await refund_service.decide_refund(db, refund.id, approve=False)
    assert decided.status == RefundStatus.rejected
    lister_w = await wallet_service.get_or_create_wallet(db, lister.id)
    assert lister_w.held_minor == 100000  # still held


async def test_refund_cannot_be_decided_twice(db: AsyncSession) -> None:
    lister, provider, tweak, app = await _completed_job(db)
    refund = await refund_service.request_refund(
        db, lister.id, RefundCreate(application_id=app.id, amount_minor=100000)
    )
    await refund_service.decide_refund(db, refund.id, approve=False)
    with pytest.raises(AppError) as exc:
        await refund_service.decide_refund(db, refund.id, approve=True)
    assert exc.value.code == "INVALID_STATE"


# ---- Ratings ----

async def test_rating_requires_completed_tweak(db: AsyncSession) -> None:
    lister, provider, tweak, app = await _completed_job(db)  # tweak is in_progress
    with pytest.raises(AppError) as exc:
        await rating_service.create_rating(
            db, lister.id, RatingCreate(tweak_id=tweak.id, ratee_user_id=provider.id, score=5)
        )
    assert exc.value.code == "TWEAK_NOT_COMPLETED"


async def test_rating_after_completion_and_aggregate(db: AsyncSession) -> None:
    lister, provider, tweak, app = await _completed_job(db)
    await application_service.complete(db, app.id, lister.id)
    rating = await rating_service.create_rating(
        db, lister.id, RatingCreate(tweak_id=tweak.id, ratee_user_id=provider.id, score=4)
    )
    assert rating.score == 4
    await db.refresh(provider)
    assert provider.rating_count == 1
    assert float(provider.rating_avg) == 4.0


async def test_cannot_rate_twice(db: AsyncSession) -> None:
    lister, provider, tweak, app = await _completed_job(db)
    await application_service.complete(db, app.id, lister.id)
    await rating_service.create_rating(
        db, lister.id, RatingCreate(tweak_id=tweak.id, ratee_user_id=provider.id, score=5)
    )
    with pytest.raises(AppError) as exc:
        await rating_service.create_rating(
            db, lister.id, RatingCreate(tweak_id=tweak.id, ratee_user_id=provider.id, score=3)
        )
    assert exc.value.code == "ALREADY_RATED"


async def test_cannot_rate_self(db: AsyncSession) -> None:
    lister, provider, tweak, app = await _completed_job(db)
    await application_service.complete(db, app.id, lister.id)
    with pytest.raises(AppError) as exc:
        await rating_service.create_rating(
            db, lister.id, RatingCreate(tweak_id=tweak.id, ratee_user_id=lister.id, score=5)
        )
    assert exc.value.code in ("CANNOT_RATE_SELF", "NOT_A_PARTY")


async def test_non_party_cannot_rate(db: AsyncSession) -> None:
    lister, provider, tweak, app = await _completed_job(db)
    await application_service.complete(db, app.id, lister.id)
    stranger = await make_user(db)
    with pytest.raises(AppError) as exc:
        await rating_service.create_rating(
            db, stranger.id, RatingCreate(tweak_id=tweak.id, ratee_user_id=provider.id, score=5)
        )
    assert exc.value.code == "NOT_A_PARTY"
    assert ApplicationStatus  # import used
