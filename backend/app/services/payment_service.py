"""Razorpay wallet top-ups and withdrawal (payout) records.

Top-up: create a Razorpay order -> client completes Checkout -> client calls verify (or
Razorpay calls the webhook) -> the order is credited exactly once through the existing
`wallet_service.topup` ledger, keyed by `razorpay:{payment_id}`.
"""

import json
import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.models.enums import NotificationType, PaymentStatus, PayoutStatus
from app.models.payment import PaymentOrder, Payout
from app.models.user import User
from app.models.wallet import WalletTransaction
from app.services import kyc_service, notification_service, razorpay_client, wallet_service

logger = logging.getLogger(__name__)

CURRENCY = "INR"


def _rupees(amount_minor: int) -> str:
    """Integer-exact display, e.g. 123456 -> '₹1,234.56'."""
    return f"₹{amount_minor // 100:,}.{amount_minor % 100:02d}"


def _reference(payment_id: str) -> str:
    return f"razorpay:{payment_id}"


# ─── Top-up ─────────────────────────────────────────────────────────────────


async def create_topup_order(
    db: AsyncSession, user_id: uuid.UUID, amount_minor: int
) -> PaymentOrder:
    if not settings.WALLET_TOPUP_MIN_MINOR <= amount_minor <= settings.WALLET_TOPUP_MAX_MINOR:
        raise AppError(
            status.HTTP_400_BAD_REQUEST,
            "AMOUNT_OUT_OF_RANGE",
            f"Top-up must be between {_rupees(settings.WALLET_TOPUP_MIN_MINOR)} and "
            f"{_rupees(settings.WALLET_TOPUP_MAX_MINOR)}.",
        )
    local_id = uuid.uuid4()
    remote = await razorpay_client.create_order(
        amount_minor, CURRENCY, receipt=str(local_id), notes={"user_id": str(user_id)}
    )
    order = PaymentOrder(
        id=local_id,
        user_id=user_id,
        provider="razorpay",
        provider_order_id=str(remote["id"]),
        amount_minor=amount_minor,
        currency=CURRENCY,
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order


async def verify_topup(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    provider_order_id: str,
    payment_id: str,
    signature: str,
) -> tuple[PaymentOrder, WalletTransaction]:
    """Client-side completion. Signature proves Razorpay issued this payment for the order;
    the payment is then fetched (and captured if only authorized) before crediting."""
    if not razorpay_client.verify_payment_signature(provider_order_id, payment_id, signature):
        raise AppError(
            status.HTTP_400_BAD_REQUEST, "INVALID_SIGNATURE", "Payment signature mismatch."
        )
    order = await db.scalar(
        select(PaymentOrder).where(PaymentOrder.provider_order_id == provider_order_id)
    )
    # Someone else's order is reported as missing, not forbidden, to avoid leaking ids.
    if order is None or order.user_id != user_id:
        raise AppError(
            status.HTTP_404_NOT_FOUND, "PAYMENT_ORDER_NOT_FOUND", "Payment order not found."
        )
    if order.status == PaymentStatus.paid:
        return await _credit(db, provider_order_id, payment_id)

    payment = await razorpay_client.fetch_payment(payment_id)
    _check_payment_matches(order, payment)
    if payment.get("status") == "authorized":
        payment = await razorpay_client.capture_payment(
            payment_id, order.amount_minor, order.currency
        )
    if payment.get("status") != "captured":
        if payment.get("status") == "failed":
            order.status = PaymentStatus.failed
            order.failure_reason = str(payment.get("error_description") or "Payment failed.")
            await db.commit()
        raise AppError(
            status.HTTP_400_BAD_REQUEST,
            "PAYMENT_NOT_CAPTURED",
            f"Payment is {payment.get('status', 'unknown')}, not captured.",
        )
    return await _credit(db, provider_order_id, payment_id)


def _check_payment_matches(order: PaymentOrder, payment: dict[str, Any]) -> None:
    if (
        payment.get("order_id") != order.provider_order_id
        or payment.get("amount") != order.amount_minor
        or payment.get("currency") != order.currency
    ):
        raise AppError(
            status.HTTP_400_BAD_REQUEST,
            "PAYMENT_MISMATCH",
            "Payment does not match this order.",
        )


async def _credit(
    db: AsyncSession, provider_order_id: str, payment_id: str
) -> tuple[PaymentOrder, WalletTransaction]:
    """Mark the order paid and credit the wallet, once. Safe under verify/webhook races:
    the order row is locked, and the ledger reference is unique."""
    order = await db.scalar(
        select(PaymentOrder)
        .where(PaymentOrder.provider_order_id == provider_order_id)
        .with_for_update()
    )
    if order is None:
        raise AppError(
            status.HTTP_404_NOT_FOUND, "PAYMENT_ORDER_NOT_FOUND", "Payment order not found."
        )
    if order.status == PaymentStatus.paid:
        existing = await db.scalar(
            select(WalletTransaction).where(WalletTransaction.reference == _reference(payment_id))
        )
        await db.commit()  # release the row lock
        if order.provider_payment_id != payment_id or existing is None:
            raise AppError(
                status.HTTP_409_CONFLICT,
                "ORDER_ALREADY_PAID",
                "This order was already paid by another payment.",
            )
        return order, existing

    order.status = PaymentStatus.paid
    order.provider_payment_id = payment_id
    order.paid_at = datetime.now(UTC)
    order.failure_reason = None
    notification_service.add(
        db,
        order.user_id,
        NotificationType.wallet_topup,
        "Money added",
        f"{_rupees(order.amount_minor)} was added to your wallet.",
    )
    # Commits the order update, notification and ledger entry together.
    txn = await wallet_service.topup(
        db, order.user_id, order.amount_minor, reference=_reference(payment_id)
    )
    # topup() returns early without committing if the reference already exists; make sure
    # the order update still lands in that case.
    await db.commit()
    await db.refresh(order)
    return order, txn


async def handle_webhook(db: AsyncSession, body: bytes, signature: str | None) -> str:
    """Server-to-server confirmation. Returns 'processed' or 'ignored'."""
    if not razorpay_client.verify_webhook_signature(body, signature):
        raise AppError(
            status.HTTP_400_BAD_REQUEST, "INVALID_SIGNATURE", "Webhook signature mismatch."
        )
    try:
        event = json.loads(body)
    except ValueError as exc:
        raise AppError(status.HTTP_400_BAD_REQUEST, "INVALID_PAYLOAD", "Body is not JSON.") from exc

    name = event.get("event")
    payment = ((event.get("payload") or {}).get("payment") or {}).get("entity") or {}
    order_id = payment.get("order_id")
    if not order_id:
        return "ignored"
    order = await db.scalar(select(PaymentOrder).where(PaymentOrder.provider_order_id == order_id))
    if order is None:
        logger.info("Razorpay webhook %s for unknown order %s", name, order_id)
        return "ignored"

    if name in ("payment.captured", "order.paid"):
        try:
            _check_payment_matches(order, payment)
        except AppError:
            logger.error("Razorpay webhook amount/currency mismatch for order %s", order_id)
            return "ignored"
        try:
            await _credit(db, order_id, str(payment["id"]))
        except AppError as exc:
            if exc.code != "ORDER_ALREADY_PAID":
                raise
            logger.warning("Order %s paid twice; second payment %s", order_id, payment["id"])
        return "processed"

    if name == "payment.failed" and order.status == PaymentStatus.created:
        # Informational: Checkout lets the user retry, and a later capture still credits.
        order.status = PaymentStatus.failed
        order.failure_reason = str(payment.get("error_description") or "Payment failed.")
        await db.commit()
        return "processed"
    return "ignored"


# ─── Payouts ────────────────────────────────────────────────────────────────


async def request_payout(
    db: AsyncSession, user: User, amount_minor: int, upi_id: str | None = None
) -> Payout:
    """Withdraw to UPI. Funds leave the balance now; an admin sends the transfer.

    With KYC_REQUIRED_FOR_PAYOUT (default) the user must be verified and the money goes to
    the UPI id checked during verification.
    """
    user_id = user.id
    if settings.KYC_REQUIRED_FOR_PAYOUT:
        verified = await kyc_service.verified_upi(db, user)
        if verified is None:
            raise AppError(
                status.HTTP_403_FORBIDDEN,
                "KYC_REQUIRED",
                "Verify your identity before withdrawing.",
            )
        if upi_id is not None and upi_id != verified:
            raise AppError(
                status.HTTP_400_BAD_REQUEST,
                "UPI_NOT_VERIFIED",
                "Withdrawals go to the UPI id you verified.",
            )
        upi_id = verified
    elif upi_id is None:
        raise AppError(status.HTTP_422_UNPROCESSABLE_ENTITY, "UPI_REQUIRED", "Enter a UPI id.")
    if amount_minor < settings.PAYOUT_MIN_MINOR:
        raise AppError(
            status.HTTP_400_BAD_REQUEST,
            "AMOUNT_OUT_OF_RANGE",
            f"Minimum withdrawal is {_rupees(settings.PAYOUT_MIN_MINOR)}.",
        )
    payout = Payout(id=uuid.uuid4(), user_id=user_id, amount_minor=amount_minor, upi_id=upi_id)
    txn = await wallet_service.debit_payout(
        db, user_id, amount_minor, reference=f"payout:{payout.id}"
    )
    db.add(payout)
    await db.flush()
    payout.debit_txn_id = txn.id
    await db.commit()
    await db.refresh(payout)
    return payout


async def list_payouts(
    db: AsyncSession, user_id: uuid.UUID, *, page: int, limit: int
) -> tuple[list[Payout], int]:
    total = (
        await db.scalar(select(func.count()).select_from(Payout).where(Payout.user_id == user_id))
    ) or 0
    rows = (
        await db.scalars(
            select(Payout)
            .where(Payout.user_id == user_id)
            .order_by(Payout.created_at.desc(), Payout.id.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    ).all()
    return list(rows), total


async def decide_payout(
    db: AsyncSession,
    payout_id: uuid.UUID,
    *,
    approve: bool,
    reference: str | None,
    reason: str | None,
) -> Payout:
    """Admin: mark sent (with the transfer reference) or reject (re-credits the wallet)."""
    payout = await db.scalar(select(Payout).where(Payout.id == payout_id).with_for_update())
    if payout is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "PAYOUT_NOT_FOUND", "Payout not found.")
    if payout.status != PayoutStatus.requested:
        raise AppError(status.HTTP_409_CONFLICT, "INVALID_STATE", "Payout already decided.")

    payout.processed_at = datetime.now(UTC)
    if approve:
        if not reference:
            raise AppError(
                status.HTTP_400_BAD_REQUEST,
                "REFERENCE_REQUIRED",
                "A transfer reference is required to mark a payout paid.",
            )
        payout.status = PayoutStatus.paid
        payout.reference = reference
        notification_service.add(
            db,
            payout.user_id,
            NotificationType.system,
            "Withdrawal sent",
            f"{_rupees(payout.amount_minor)} was sent to {payout.upi_id}.",
        )
    else:
        txn = await wallet_service.reverse_payout(
            db, payout.user_id, payout.amount_minor, reference=f"payout-reversal:{payout.id}"
        )
        await db.flush()
        payout.reversal_txn_id = txn.id
        payout.status = PayoutStatus.rejected
        payout.failure_reason = reason
        notification_service.add(
            db,
            payout.user_id,
            NotificationType.system,
            "Withdrawal rejected",
            f"{_rupees(payout.amount_minor)} was returned to your wallet."
            + (f" Reason: {reason}" if reason else ""),
        )
    await db.commit()
    await db.refresh(payout)
    return payout
