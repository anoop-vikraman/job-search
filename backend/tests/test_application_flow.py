import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.enums import ApplicationStatus, PricingModel, TweakStatus, TweakType
from app.models.tweak import Tweak
from app.schemas.application import ApplicationCreate, CounterQuoteRequest
from app.services import application_service, wallet_service
from tests.conftest import make_user


async def _active_tweak(db: AsyncSession, owner_id, price: int | None = 100000) -> Tweak:
    tweak = Tweak(
        created_by_user_id=owner_id,
        title="Test job",
        description="desc",
        category="Plumbing",
        tweak_type=TweakType.in_person,
        status=TweakStatus.active,
        pricing_model=PricingModel.fixed,
        pricing_data={"amount_minor": price} if price else None,
        price_minor=price,
        currency="INR",
    )
    db.add(tweak)
    await db.flush()
    return tweak


async def test_cannot_apply_to_own_tweak(db: AsyncSession) -> None:
    lister = await make_user(db)
    tweak = await _active_tweak(db, lister.id)
    with pytest.raises(AppError) as exc:
        await application_service.apply(db, tweak.id, lister.id, ApplicationCreate())
    assert exc.value.code == "CANNOT_APPLY_OWN_TWEAK"


async def test_duplicate_active_application_rejected(db: AsyncSession) -> None:
    lister = await make_user(db)
    provider = await make_user(db)
    tweak = await _active_tweak(db, lister.id)
    await application_service.apply(db, tweak.id, provider.id, ApplicationCreate())
    with pytest.raises(AppError) as exc:
        await application_service.apply(db, tweak.id, provider.id, ApplicationCreate())
    assert exc.value.code == "ALREADY_APPLIED"


async def test_accept_places_hold_and_sets_in_progress(db: AsyncSession) -> None:
    lister = await make_user(db, balance_minor=200000)
    provider = await make_user(db)
    tweak = await _active_tweak(db, lister.id, price=100000)
    app = await application_service.apply(
        db, tweak.id, provider.id, ApplicationCreate(quoted_price_minor=100000)
    )
    accepted = await application_service.accept(db, app.id, lister.id)
    assert accepted.status == ApplicationStatus.accepted

    wallet = await wallet_service.get_or_create_wallet(db, lister.id)
    assert wallet.held_minor == 100000
    refreshed = await db.get(Tweak, tweak.id)
    assert refreshed is not None and refreshed.status == TweakStatus.in_progress


async def test_accept_requires_sufficient_balance(db: AsyncSession) -> None:
    lister = await make_user(db, balance_minor=1000)
    provider = await make_user(db)
    tweak = await _active_tweak(db, lister.id, price=100000)
    app = await application_service.apply(db, tweak.id, provider.id, ApplicationCreate())
    with pytest.raises(AppError) as exc:
        await application_service.accept(db, app.id, lister.id)
    assert exc.value.code == "INSUFFICIENT_BALANCE"


async def test_complete_releases_escrow_with_fee(db: AsyncSession) -> None:
    lister = await make_user(db, balance_minor=200000)
    provider = await make_user(db)
    tweak = await _active_tweak(db, lister.id, price=100000)
    app = await application_service.apply(
        db, tweak.id, provider.id, ApplicationCreate(quoted_price_minor=100000)
    )
    await application_service.accept(db, app.id, lister.id)
    completed = await application_service.complete(db, app.id, lister.id)
    assert completed.status == ApplicationStatus.completed

    lister_w = await wallet_service.get_or_create_wallet(db, lister.id)
    provider_w = await wallet_service.get_or_create_wallet(db, provider.id)
    assert lister_w.held_minor == 0
    # Default fee 5% of 100000 = 5000; provider gets 95000.
    assert provider_w.balance_minor == 95000
    refreshed = await db.get(Tweak, tweak.id)
    assert refreshed is not None and refreshed.status == TweakStatus.completed


async def test_cancel_refunds_hold_to_lister(db: AsyncSession) -> None:
    lister = await make_user(db, balance_minor=200000)
    provider = await make_user(db)
    tweak = await _active_tweak(db, lister.id, price=100000)
    app = await application_service.apply(db, tweak.id, provider.id, ApplicationCreate())
    await application_service.accept(db, app.id, lister.id)
    await application_service.cancel(db, app.id, lister.id)
    lister_w = await wallet_service.get_or_create_wallet(db, lister.id)
    assert lister_w.balance_minor == 200000
    assert lister_w.held_minor == 0


async def test_only_owner_can_accept(db: AsyncSession) -> None:
    lister = await make_user(db, balance_minor=200000)
    provider = await make_user(db)
    stranger = await make_user(db)
    tweak = await _active_tweak(db, lister.id)
    app = await application_service.apply(db, tweak.id, provider.id, ApplicationCreate())
    with pytest.raises(AppError) as exc:
        await application_service.accept(db, app.id, stranger.id)
    assert exc.value.code == "TWEAK_ACCESS_DENIED"


async def test_counter_quote_creates_offer(db: AsyncSession) -> None:
    lister = await make_user(db)
    provider = await make_user(db)
    tweak = await _active_tweak(db, lister.id)
    app = await application_service.apply(
        db, tweak.id, provider.id, ApplicationCreate(quoted_price_minor=120000)
    )
    offer = await application_service.counter_quote(
        db, app.id, lister.id, CounterQuoteRequest(lister_quoted_price_minor=90000)
    )
    assert offer.lister_quoted_price_minor == 90000
