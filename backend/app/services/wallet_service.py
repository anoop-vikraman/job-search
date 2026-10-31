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
) -> None:
    """Completion: release the lister's hold to the provider's balance."""
    lister = await get_or_create_wallet(db, lister_user_id)
    if lister.held_minor < amount_minor:
        raise AppError(status.HTTP_400_BAD_REQUEST, "NO_HELD_FUNDS", "No matching held funds.")
    provider = await get_or_create_wallet(db, provider_user_id)
    _record(
        db, lister, TxnType.release, -amount_minor, tweak_id=tweak_id, application_id=application_id
    )
    lister.held_minor -= amount_minor
    _record(
        db,
        provider,
        TxnType.release,
        amount_minor,
        tweak_id=tweak_id,
        application_id=application_id,
    )
    provider.balance_minor += amount_minor


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
