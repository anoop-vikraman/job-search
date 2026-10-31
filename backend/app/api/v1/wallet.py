from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DbSession
from app.models.wallet import WalletTransaction
from app.schemas.common import ErrorResponse, Page
from app.schemas.wallet import TopupRequest, TransactionResponse, WalletResponse
from app.services import wallet_service

router = APIRouter(prefix="/wallet", tags=["wallet"])


@router.get("", response_model=WalletResponse)
async def get_wallet(user: CurrentUser, db: DbSession) -> WalletResponse:
    """Return the authenticated user's wallet (available + held balances)."""
    wallet = await wallet_service.get_or_create_wallet(db, user.id)
    await db.commit()
    return WalletResponse.model_validate(wallet)


@router.post(
    "/topup", response_model=TransactionResponse, responses={422: {"model": ErrorResponse}}
)
async def topup(data: TopupRequest, user: CurrentUser, db: DbSession) -> TransactionResponse:
    """Add funds to the wallet (idempotent on `reference`)."""
    txn = await wallet_service.topup(db, user.id, data.amount_minor, data.reference)
    return TransactionResponse.model_validate(txn)


@router.get("/transactions", response_model=Page[TransactionResponse])
async def list_transactions(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> Page[TransactionResponse]:
    """Paginated wallet ledger, newest first."""
    wallet = await wallet_service.get_or_create_wallet(db, user.id)
    await db.commit()
    total = (
        await db.scalar(
            select(func.count())
            .select_from(WalletTransaction)
            .where(WalletTransaction.wallet_id == wallet.id)
        )
    ) or 0
    rows = (
        await db.scalars(
            select(WalletTransaction)
            .where(WalletTransaction.wallet_id == wallet.id)
            .order_by(WalletTransaction.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    return Page(
        items=[TransactionResponse.model_validate(t) for t in rows],
        total=total,
        page=page,
        limit=limit,
    )
