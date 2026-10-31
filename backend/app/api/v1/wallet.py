from fastapi import APIRouter, Header, Query, Request, status
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.core.errors import AppError
from app.models.wallet import WalletTransaction
from app.schemas.common import ErrorResponse, Page
from app.schemas.payment import (
    PayoutCreate,
    PayoutResponse,
    TopupOrderCreate,
    TopupOrderResponse,
    TopupVerifyRequest,
    TopupVerifyResponse,
    WebhookAck,
)
from app.schemas.wallet import TopupRequest, TransactionResponse, WalletResponse
from app.services import payment_service, razorpay_client, wallet_service

router = APIRouter(prefix="/wallet", tags=["wallet"])


@router.get("", response_model=WalletResponse)
async def get_wallet(user: CurrentUser, db: DbSession) -> WalletResponse:
    """Return the authenticated user's wallet (available + held balances)."""
    wallet = await wallet_service.get_or_create_wallet(db, user.id)
    await db.commit()
    return WalletResponse.model_validate(wallet)


@router.post(
    "/topup",
    response_model=TransactionResponse,
    responses={403: {"model": ErrorResponse}, 422: {"model": ErrorResponse}},
)
async def topup(data: TopupRequest, user: CurrentUser, db: DbSession) -> TransactionResponse:
    """Simulated top-up without payment (local dev only; idempotent on `reference`).

    Disabled when `WALLET_SIMULATED_TOPUP_ENABLED=false`; use /wallet/topup/order instead.
    """
    if not settings.WALLET_SIMULATED_TOPUP_ENABLED:
        raise AppError(
            status.HTTP_403_FORBIDDEN,
            "SIMULATED_TOPUP_DISABLED",
            "Add money through the payment gateway.",
        )
    txn = await wallet_service.topup(db, user.id, data.amount_minor, data.reference)
    return TransactionResponse.model_validate(txn)


@router.post(
    "/topup/order",
    response_model=TopupOrderResponse,
    status_code=status.HTTP_201_CREATED,
    responses={400: {"model": ErrorResponse}, 422: {"model": ErrorResponse}},
)
async def create_topup_order(
    data: TopupOrderCreate, user: CurrentUser, db: DbSession
) -> TopupOrderResponse:
    """Create a Razorpay order for a wallet top-up; open Checkout with the returned fields."""
    order = await payment_service.create_topup_order(db, user.id, data.amount_minor)
    return TopupOrderResponse(
        id=order.id,
        provider=order.provider,
        provider_order_id=order.provider_order_id,
        amount_minor=order.amount_minor,
        currency=order.currency,
        key_id=settings.RAZORPAY_KEY_ID or "",
        test_mode=razorpay_client.is_test_mode(),
    )


@router.post(
    "/topup/verify",
    response_model=TopupVerifyResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
)
async def verify_topup(
    data: TopupVerifyRequest, user: CurrentUser, db: DbSession
) -> TopupVerifyResponse:
    """Confirm a completed Checkout payment and credit the wallet (idempotent)."""
    order, txn = await payment_service.verify_topup(
        db,
        user.id,
        provider_order_id=data.razorpay_order_id,
        payment_id=data.razorpay_payment_id,
        signature=data.razorpay_signature,
    )
    wallet = await wallet_service.get_or_create_wallet(db, user.id)
    return TopupVerifyResponse(
        status=order.status,
        transaction=TransactionResponse.model_validate(txn),
        wallet=WalletResponse.model_validate(wallet),
    )


@router.post(
    "/razorpay/webhook",
    response_model=WebhookAck,
    status_code=status.HTTP_200_OK,
    responses={400: {"model": ErrorResponse}},
)
async def razorpay_webhook(
    request: Request,
    db: DbSession,
    x_razorpay_signature: str | None = Header(None),
) -> WebhookAck:
    """Razorpay server-to-server events (no user auth; HMAC-verified).

    Credits `payment.captured` / `order.paid` for known orders; unknown orders are
    acknowledged and ignored so Razorpay stops retrying.
    """
    body = await request.body()
    result = await payment_service.handle_webhook(db, body, x_razorpay_signature)
    return WebhookAck(status=result)


@router.post(
    "/payouts",
    response_model=PayoutResponse,
    status_code=status.HTTP_201_CREATED,
    responses={400: {"model": ErrorResponse}, 422: {"model": ErrorResponse}},
)
async def request_payout(data: PayoutCreate, user: CurrentUser, db: DbSession) -> PayoutResponse:
    """Withdraw to a UPI id. The amount leaves the balance now; an admin sends the transfer."""
    payout = await payment_service.request_payout(db, user.id, data.amount_minor, data.upi_id)
    return PayoutResponse.model_validate(payout)


@router.get("/payouts", response_model=Page[PayoutResponse], status_code=status.HTTP_200_OK)
async def list_payouts(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> Page[PayoutResponse]:
    """The caller's withdrawal requests, newest first."""
    rows, total = await payment_service.list_payouts(db, user.id, page=page, limit=limit)
    return Page(
        items=[PayoutResponse.model_validate(p) for p in rows],
        total=total,
        page=page,
        limit=limit,
    )


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
