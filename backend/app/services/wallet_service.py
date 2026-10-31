import uuid

from fastapi import status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.enums import TxnStatus, TxnType
from app.models.wallet import Wallet, WalletTransaction


async def get_or_create_wallet(db: AsyncSession, user_id: uuid.UUID) -> Wallet:
    wallet = await db.scalar(select(Wallet).where(Wallet.user_id == user_id))
    if wallet is None:
        wallet = Wallet(user_id=user_id)
        db.add(wallet)
        await db.flush()
    return wallet


def _record(
    db: AsyncSession,
    wallet: Wallet,
    txn_type: TxnType,
    amount_minor: int,
    *,
    tweak_id: uuid.UUID | None = None,
    application_id: uuid.UUID | None = None,
    reference: str | None = None,
) -> WalletTransaction:
    """Append a ledger entry. Balance mutations happen only through here."""
    txn = WalletTransaction(
        wallet_id=wallet.id,
        type=txn_type,
        status=TxnStatus.completed,
        amount_minor=amount_minor,
        tweak_id=tweak_id,
        application_id=application_id,
        reference=reference,
    )
    db.add(txn)
    return txn


async def topup(
    db: AsyncSession, user_id: uuid.UUID, amount_minor: int, reference: str | None
) -> WalletTransaction:
    wallet = await get_or_create_wallet(db, user_id)
    if reference is not None:
        dup = await db.scalar(
            select(WalletTransaction).where(WalletTransaction.reference == reference)
        )
        if dup is not None:
            return dup  # idempotent top-up
    txn = _record(db, wallet, TxnType.topup, amount_minor, reference=reference)
    wallet.balance_minor += amount_minor
    await db.commit()
    await db.refresh(txn)
    return txn


async def place_hold(
    db: AsyncSession,
    lister_user_id: uuid.UUID,
    amount_minor: int,
    tweak_id: uuid.UUID,
    application_id: uuid.UUID,
) -> None:
    """Escrow hold placed when an application is accepted."""
    wallet = await get_or_create_wallet(db, lister_user_id)
    if wallet.balance_minor < amount_minor:
        raise AppError(
            status.HTTP_400_BAD_REQUEST, "INSUFFICIENT_BALANCE", "Insufficient wallet balance."
        )
    _record(
        db, wallet, TxnType.hold, -amount_minor, tweak_id=tweak_id, application_id=application_id
    )
    wallet.balance_minor -= amount_minor
    wallet.held_minor += amount_minor


async def release_hold(
    db: AsyncSession,
    lister_user_id: uuid.UUID,
    provider_user_id: uuid.UUID,
    amount_minor: int,
    tweak_id: uuid.UUID,
    application_id: uuid.UUID,
    fee_minor: int = 0,
) -> None:
    """Completion: release the lister's hold to the provider (minus the platform fee).

    The lister's full held amount is released; the provider receives
    `amount_minor - fee_minor`, and `fee_minor` is recorded as a platform fee.
    """
    if fee_minor < 0 or fee_minor > amount_minor:
        raise AppError(status.HTTP_400_BAD_REQUEST, "INVALID_FEE", "Invalid platform fee.")
    lister = await get_or_create_wallet(db, lister_user_id)
    if lister.held_minor < amount_minor:
        raise AppError(status.HTTP_400_BAD_REQUEST, "NO_HELD_FUNDS", "No matching held funds.")
    provider = await get_or_create_wallet(db, provider_user_id)

    # Invariant: balance_minor == sum(completed txn amounts) per wallet. Releasing escrow
    # only empties the lister's `held` (balance was already debited at hold time), so the
    # lister's release entry is net-zero to the balance ledger.
    _record(
        db, lister, TxnType.release, 0, tweak_id=tweak_id, application_id=application_id
    )
    lister.held_minor -= amount_minor

    # Provider is credited the full released amount, then the platform fee is debited.
    _record(
        db,
        provider,
        TxnType.release,
        amount_minor,
        tweak_id=tweak_id,
        application_id=application_id,
    )
    provider.balance_minor += amount_minor
    if fee_minor > 0:
        _record(
            db, provider, TxnType.fee, -fee_minor, tweak_id=tweak_id, application_id=application_id
        )
        provider.balance_minor -= fee_minor


async def refund_hold(
    db: AsyncSession,
    lister_user_id: uuid.UUID,
    amount_minor: int,
    application_id: uuid.UUID,
) -> WalletTransaction:
    """Cancellation/refund: return the held amount to the lister's balance."""
    wallet = await get_or_create_wallet(db, lister_user_id)
    if wallet.held_minor < amount_minor:
        raise AppError(status.HTTP_400_BAD_REQUEST, "NO_HELD_FUNDS", "No matching held funds.")
    txn = _record(db, wallet, TxnType.refund, amount_minor, application_id=application_id)
    wallet.held_minor -= amount_minor
    wallet.balance_minor += amount_minor
    return txn


async def debit_payout(
    db: AsyncSession, user_id: uuid.UUID, amount_minor: int, reference: str
) -> WalletTransaction:
    """Withdrawal request: move funds out of the available balance (caller commits).

    The wallet row is locked so concurrent withdrawals can't overdraw it.
    """
    await get_or_create_wallet(db, user_id)
    wallet = await db.scalar(select(Wallet).where(Wallet.user_id == user_id).with_for_update())
    if wallet is None or wallet.balance_minor < amount_minor:
        raise AppError(
            status.HTTP_400_BAD_REQUEST, "INSUFFICIENT_BALANCE", "Insufficient wallet balance."
        )
    txn = _record(db, wallet, TxnType.payout, -amount_minor, reference=reference)
    wallet.balance_minor -= amount_minor
    return txn


async def reverse_payout(
    db: AsyncSession, user_id: uuid.UUID, amount_minor: int, reference: str
) -> WalletTransaction:
    """Rejected withdrawal: credit the debited amount back (caller commits)."""
    wallet = await get_or_create_wallet(db, user_id)
    txn = _record(db, wallet, TxnType.payout, amount_minor, reference=reference)
    wallet.balance_minor += amount_minor
    return txn


async def split_hold(
    db: AsyncSession,
    lister_user_id: uuid.UUID,
    provider_user_id: uuid.UUID,
    held_minor: int,
    provider_minor: int,
    tweak_id: uuid.UUID,
    application_id: uuid.UUID,
    fee_minor: int = 0,
) -> None:
    """Dispute settlement: `provider_minor` of the hold goes to the provider (minus
    `fee_minor`), the rest returns to the lister. Caller commits."""
    if not 0 <= provider_minor <= held_minor or not 0 <= fee_minor <= provider_minor:
        raise AppError(status.HTTP_400_BAD_REQUEST, "INVALID_SPLIT", "Invalid split amounts.")
    lister = await get_or_create_wallet(db, lister_user_id)
    if lister.held_minor < held_minor:
        raise AppError(status.HTTP_400_BAD_REQUEST, "NO_HELD_FUNDS", "No matching held funds.")
    provider = await get_or_create_wallet(db, provider_user_id)

    lister.held_minor -= held_minor
    refund_minor = held_minor - provider_minor
    # Net-zero marker for the released part (balance was debited at hold time).
    _record(db, lister, TxnType.release, 0, tweak_id=tweak_id, application_id=application_id)
    if refund_minor > 0:
        _record(
            db,
            lister,
            TxnType.refund,
            refund_minor,
            tweak_id=tweak_id,
            application_id=application_id,
        )
        lister.balance_minor += refund_minor
    if provider_minor > 0:
        _record(
            db,
            provider,
            TxnType.release,
            provider_minor,
            tweak_id=tweak_id,
            application_id=application_id,
        )
        provider.balance_minor += provider_minor
    if fee_minor > 0:
        _record(
            db, provider, TxnType.fee, -fee_minor, tweak_id=tweak_id, application_id=application_id
        )
        provider.balance_minor -= fee_minor
