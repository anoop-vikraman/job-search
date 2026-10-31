import uuid

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.enums import TxnStatus
from app.models.wallet import WalletTransaction
from app.services import wallet_service
from tests.conftest import make_user


async def _ledger_sum(db: AsyncSession, wallet_id: uuid.UUID) -> int:
    return (
        await db.scalar(
            select(func.coalesce(func.sum(WalletTransaction.amount_minor), 0)).where(
                WalletTransaction.wallet_id == wallet_id,
                WalletTransaction.status == TxnStatus.completed,
            )
        )
    ) or 0


async def test_topup_increases_balance(db: AsyncSession) -> None:
    user = await make_user(db)
    await wallet_service.topup(db, user.id, 10000, reference="r1")
    wallet = await wallet_service.get_or_create_wallet(db, user.id)
    assert wallet.balance_minor == 10000


async def test_topup_is_idempotent_on_reference(db: AsyncSession) -> None:
    user = await make_user(db)
    await wallet_service.topup(db, user.id, 10000, reference="dup")
    await wallet_service.topup(db, user.id, 10000, reference="dup")
    wallet = await wallet_service.get_or_create_wallet(db, user.id)
    assert wallet.balance_minor == 10000  # not doubled


async def test_hold_moves_balance_to_held(db: AsyncSession) -> None:
    lister = await make_user(db, balance_minor=50000)
    await wallet_service.place_hold(
        db, lister.id, 20000, tweak_id=None, application_id=None
    )
    wallet = await wallet_service.get_or_create_wallet(db, lister.id)
    assert wallet.balance_minor == 30000
    assert wallet.held_minor == 20000


async def test_hold_rejects_insufficient_balance(db: AsyncSession) -> None:
    lister = await make_user(db, balance_minor=1000)
    with pytest.raises(AppError) as exc:
        await wallet_service.place_hold(
            db, lister.id, 5000, tweak_id=None, application_id=None
        )
    assert exc.value.code == "INSUFFICIENT_BALANCE"


async def test_release_pays_provider_minus_fee_and_reconciles(db: AsyncSession) -> None:
    lister = await make_user(db, balance_minor=100000)
    provider = await make_user(db)
    await wallet_service.place_hold(db, lister.id, 60000, tweak_id=None, application_id=None)
    await wallet_service.release_hold(
        db, lister.id, provider.id, 60000, tweak_id=None, application_id=None, fee_minor=3000
    )

    lister_w = await wallet_service.get_or_create_wallet(db, lister.id)
    provider_w = await wallet_service.get_or_create_wallet(db, provider.id)

    assert lister_w.balance_minor == 40000
    assert lister_w.held_minor == 0
    assert provider_w.balance_minor == 57000  # 60000 - 3000 fee

    # Ledger invariant: balance_minor == sum(completed txn amounts) per wallet.
    assert lister_w.balance_minor == await _ledger_sum(db, lister_w.id)
    assert provider_w.balance_minor == await _ledger_sum(db, provider_w.id)


async def test_refund_returns_held_to_lister(db: AsyncSession) -> None:
    lister = await make_user(db, balance_minor=50000)
    await wallet_service.place_hold(
        db, lister.id, 20000, tweak_id=None, application_id=None
    )
    await wallet_service.refund_hold(db, lister.id, 20000, application_id=None)
    wallet = await wallet_service.get_or_create_wallet(db, lister.id)
    assert wallet.balance_minor == 50000
    assert wallet.held_minor == 0
    assert wallet.balance_minor == await _ledger_sum(db, wallet.id)
