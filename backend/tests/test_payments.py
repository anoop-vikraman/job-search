import hashlib
import hmac
import json
from collections.abc import Iterator
from typing import Any

import httpx
import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.core.security import create_access_token
from app.models.enums import NotificationType, PaymentStatus, PayoutStatus, TxnType, UserRole
from app.models.notification import Notification
from app.models.payment import PaymentOrder
from app.models.user import User
from app.models.wallet import WalletTransaction
from app.services import payment_service, razorpay_client, wallet_service
from tests.conftest import make_user, verify_kyc

KEY_SECRET = "test_secret_123"
WEBHOOK_SECRET = "whsec_456"


class FakeRazorpay:
    """In-memory stand-in for the Razorpay Orders/Payments API."""

    def __init__(self) -> None:
        self.orders: dict[str, dict[str, Any]] = {}
        self.payments: dict[str, dict[str, Any]] = {}
        self.captures: list[str] = []

    def pay(self, order_id: str, payment_id: str, status: str = "captured", **over: Any) -> None:
        order = self.orders[order_id]
        self.payments[payment_id] = {
            "id": payment_id,
            "order_id": order_id,
            "amount": order["amount"],
            "currency": order["currency"],
            "status": status,
            **over,
        }

    def handler(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path.removeprefix("/v1")
        if request.method == "POST" and path == "/orders":
            body = json.loads(request.content)
            order_id = f"order_{len(self.orders) + 1:04d}"
            self.orders[order_id] = {"id": order_id, "status": "created", **body}
            return httpx.Response(200, json=self.orders[order_id])
        if path.startswith("/payments/"):
            payment_id = path.split("/")[2]
            payment = self.payments.get(payment_id)
            if payment is None:
                return httpx.Response(400, json={"error": {"description": "no such payment"}})
            if request.method == "POST" and path.endswith("/capture"):
                self.captures.append(payment_id)
                payment["status"] = "captured"
            return httpx.Response(200, json=payment)
        return httpx.Response(404, json={"error": {"description": "not found"}})


@pytest.fixture
def razorpay(monkeypatch: pytest.MonkeyPatch) -> Iterator[FakeRazorpay]:
    fake = FakeRazorpay()
    monkeypatch.setattr(settings, "RAZORPAY_KEY_ID", "rzp_test_abc")
    monkeypatch.setattr(settings, "RAZORPAY_KEY_SECRET", KEY_SECRET)
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", WEBHOOK_SECRET)
    monkeypatch.setattr(razorpay_client, "transport", httpx.MockTransport(fake.handler))
    yield fake


def _sign(order_id: str, payment_id: str) -> str:
    msg = f"{order_id}|{payment_id}".encode()
    return hmac.new(KEY_SECRET.encode(), msg, hashlib.sha256).hexdigest()


def _webhook(event: str, payment: dict[str, Any]) -> tuple[bytes, str]:
    body = json.dumps({"event": event, "payload": {"payment": {"entity": payment}}}).encode()
    return body, hmac.new(WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id), user.role.value)}"}


async def _balance(db: AsyncSession, user: User) -> int:
    wallet = await wallet_service.get_or_create_wallet(db, user.id)
    await db.refresh(wallet)
    return wallet.balance_minor


async def _ledger_count(db: AsyncSession, reference: str) -> int:
    count = await db.scalar(
        select(func.count())
        .select_from(WalletTransaction)
        .where(WalletTransaction.reference == reference)
    )
    return count or 0


# ─── Orders ─────────────────────────────────────────────────────────────────


async def test_create_order_validates_amount_and_records_order(
    db: AsyncSession, razorpay: FakeRazorpay
) -> None:
    user = await make_user(db)
    with pytest.raises(AppError) as exc:
        await payment_service.create_topup_order(db, user.id, 50)
    assert exc.value.code == "AMOUNT_OUT_OF_RANGE"

    order = await payment_service.create_topup_order(db, user.id, 50000)
    assert order.status == PaymentStatus.created
    remote = razorpay.orders[order.provider_order_id]
    assert remote["amount"] == 50000 and remote["currency"] == "INR"
    assert remote["receipt"] == str(order.id)


async def test_unconfigured_gateway_is_rejected(
    db: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "RAZORPAY_KEY_ID", None)
    user = await make_user(db)
    with pytest.raises(AppError) as exc:
        await payment_service.create_topup_order(db, user.id, 50000)
    assert exc.value.code == "PAYMENTS_NOT_CONFIGURED"


# ─── Verify ─────────────────────────────────────────────────────────────────


async def test_verify_credits_once_and_notifies(db: AsyncSession, razorpay: FakeRazorpay) -> None:
    user = await make_user(db)
    order = await payment_service.create_topup_order(db, user.id, 25000)
    razorpay.pay(order.provider_order_id, "pay_A")
    args = {
        "provider_order_id": order.provider_order_id,
        "payment_id": "pay_A",
        "signature": _sign(order.provider_order_id, "pay_A"),
    }

    paid, txn = await payment_service.verify_topup(db, user.id, **args)
    assert paid.status == PaymentStatus.paid
    assert paid.provider_payment_id == "pay_A"
    assert txn.type == TxnType.topup and txn.amount_minor == 25000
    assert txn.reference == "razorpay:pay_A"
    assert await _balance(db, user) == 25000

    # Retrying verify (e.g. app resumed) is idempotent.
    _, again = await payment_service.verify_topup(db, user.id, **args)
    assert again.id == txn.id
    assert await _balance(db, user) == 25000
    assert await _ledger_count(db, "razorpay:pay_A") == 1

    notes = (
        await db.scalars(
            select(Notification).where(
                Notification.user_id == user.id, Notification.type == NotificationType.wallet_topup
            )
        )
    ).all()
    assert [n.body for n in notes] == ["₹250.00 was added to your wallet."]


async def test_verify_captures_authorized_payment(db: AsyncSession, razorpay: FakeRazorpay) -> None:
    user = await make_user(db)
    order = await payment_service.create_topup_order(db, user.id, 10000)
    razorpay.pay(order.provider_order_id, "pay_B", status="authorized")
    await payment_service.verify_topup(
        db,
        user.id,
        provider_order_id=order.provider_order_id,
        payment_id="pay_B",
        signature=_sign(order.provider_order_id, "pay_B"),
    )
    assert razorpay.captures == ["pay_B"]
    assert await _balance(db, user) == 10000


@pytest.mark.parametrize(
    ("case", "code"),
    [
        ("bad_signature", "INVALID_SIGNATURE"),
        ("amount_mismatch", "PAYMENT_MISMATCH"),
        ("failed_payment", "PAYMENT_NOT_CAPTURED"),
        ("other_user", "PAYMENT_ORDER_NOT_FOUND"),
    ],
)
async def test_verify_rejections_do_not_credit(
    db: AsyncSession, razorpay: FakeRazorpay, case: str, code: str
) -> None:
    owner = await make_user(db)
    caller = await make_user(db) if case == "other_user" else owner
    order = await payment_service.create_topup_order(db, owner.id, 10000)
    if case == "amount_mismatch":
        razorpay.pay(order.provider_order_id, "pay_C", amount=100)
    elif case == "failed_payment":
        razorpay.pay(
            order.provider_order_id, "pay_C", status="failed", error_description="Declined"
        )
    else:
        razorpay.pay(order.provider_order_id, "pay_C")
    signature = "0" * 64 if case == "bad_signature" else _sign(order.provider_order_id, "pay_C")

    with pytest.raises(AppError) as exc:
        await payment_service.verify_topup(
            db,
            caller.id,
            provider_order_id=order.provider_order_id,
            payment_id="pay_C",
            signature=signature,
        )
    assert exc.value.code == code
    assert await _balance(db, owner) == 0
    if case == "failed_payment":
        await db.refresh(order)
        assert order.status == PaymentStatus.failed
        assert order.failure_reason == "Declined"


# ─── Webhook ────────────────────────────────────────────────────────────────


async def test_webhook_credits_and_is_idempotent_with_verify(
    db: AsyncSession, razorpay: FakeRazorpay
) -> None:
    user = await make_user(db)
    order = await payment_service.create_topup_order(db, user.id, 40000)
    razorpay.pay(order.provider_order_id, "pay_D")
    body, sig = _webhook("payment.captured", razorpay.payments["pay_D"])

    assert await payment_service.handle_webhook(db, body, sig) == "processed"
    assert await payment_service.handle_webhook(db, body, sig) == "processed"  # retry
    _, txn = await payment_service.verify_topup(
        db,
        user.id,
        provider_order_id=order.provider_order_id,
        payment_id="pay_D",
        signature=_sign(order.provider_order_id, "pay_D"),
    )
    assert txn.reference == "razorpay:pay_D"
    assert await _balance(db, user) == 40000
    assert await _ledger_count(db, "razorpay:pay_D") == 1


async def test_webhook_rejects_bad_signature_and_ignores_unknown_orders(
    db: AsyncSession, razorpay: FakeRazorpay
) -> None:
    body, sig = _webhook("payment.captured", {"id": "pay_X", "order_id": "order_nope"})
    with pytest.raises(AppError) as exc:
        await payment_service.handle_webhook(db, body, "deadbeef")
    assert exc.value.code == "INVALID_SIGNATURE"
    with pytest.raises(AppError):
        await payment_service.handle_webhook(db, body, None)
    assert await payment_service.handle_webhook(db, body, sig) == "ignored"


async def test_failed_then_captured_webhooks(db: AsyncSession, razorpay: FakeRazorpay) -> None:
    user = await make_user(db)
    order = await payment_service.create_topup_order(db, user.id, 20000)
    razorpay.pay(order.provider_order_id, "pay_F1", status="failed", error_description="Bank down")
    body, sig = _webhook("payment.failed", razorpay.payments["pay_F1"])
    assert await payment_service.handle_webhook(db, body, sig) == "processed"
    await db.refresh(order)
    assert order.status == PaymentStatus.failed

    # The user retried inside Checkout and the second attempt succeeded.
    razorpay.pay(order.provider_order_id, "pay_F2")
    body, sig = _webhook("payment.captured", razorpay.payments["pay_F2"])
    assert await payment_service.handle_webhook(db, body, sig) == "processed"
    await db.refresh(order)
    assert order.status == PaymentStatus.paid
    assert order.failure_reason is None
    assert await _balance(db, user) == 20000


async def test_webhook_ignores_amount_mismatch(db: AsyncSession, razorpay: FakeRazorpay) -> None:
    user = await make_user(db)
    order = await payment_service.create_topup_order(db, user.id, 20000)
    razorpay.pay(order.provider_order_id, "pay_M", amount=1)
    body, sig = _webhook("payment.captured", razorpay.payments["pay_M"])
    assert await payment_service.handle_webhook(db, body, sig) == "ignored"
    assert await _balance(db, user) == 0


# ─── HTTP ───────────────────────────────────────────────────────────────────


async def test_topup_http_flow(
    client: AsyncClient, db: AsyncSession, razorpay: FakeRazorpay
) -> None:
    user = await make_user(db)
    created = await client.post(
        "/api/v1/wallet/topup/order", json={"amount_minor": 30000}, headers=_auth(user)
    )
    assert created.status_code == 201
    body = created.json()
    assert body["key_id"] == "rzp_test_abc" and body["test_mode"] is True
    order_id = body["provider_order_id"]

    razorpay.pay(order_id, "pay_H")
    verified = await client.post(
        "/api/v1/wallet/topup/verify",
        json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": "pay_H",
            "razorpay_signature": _sign(order_id, "pay_H"),
        },
        headers=_auth(user),
    )
    assert verified.status_code == 200
    assert verified.json()["status"] == "paid"
    assert verified.json()["wallet"]["balance_minor"] == 30000

    raw, sig = _webhook("order.paid", razorpay.payments["pay_H"])
    hook = await client.post(
        "/api/v1/wallet/razorpay/webhook",
        content=raw,
        headers={"X-Razorpay-Signature": sig, "Content-Type": "application/json"},
    )
    assert hook.status_code == 200 and hook.json() == {"status": "processed"}
    bad = await client.post(
        "/api/v1/wallet/razorpay/webhook", content=raw, headers={"X-Razorpay-Signature": "x"}
    )
    assert bad.status_code == 400
    assert await _balance(db, user) == 30000
    order = await db.scalar(select(PaymentOrder).where(PaymentOrder.provider_order_id == order_id))
    assert order is not None and order.status == PaymentStatus.paid


async def test_legacy_topup_guards(
    client: AsyncClient, db: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    user = await make_user(db)
    reserved = await client.post(
        "/api/v1/wallet/topup",
        json={"amount_minor": 100, "reference": "razorpay:pay_steal"},
        headers=_auth(user),
    )
    assert reserved.status_code == 422

    monkeypatch.setattr(settings, "WALLET_SIMULATED_TOPUP_ENABLED", False)
    disabled = await client.post(
        "/api/v1/wallet/topup", json={"amount_minor": 100}, headers=_auth(user)
    )
    assert disabled.status_code == 403
    assert disabled.json()["code"] == "SIMULATED_TOPUP_DISABLED"


# ─── Payouts ────────────────────────────────────────────────────────────────


async def test_payout_debits_and_rejection_recredits(db: AsyncSession) -> None:
    user = await make_user(db, balance_minor=50000)
    with pytest.raises(AppError) as exc:
        await payment_service.request_payout(db, user, 20000)
    assert exc.value.code == "KYC_REQUIRED"
    await verify_kyc(db, user, "priya@okicici")
    with pytest.raises(AppError) as exc:
        await payment_service.request_payout(db, user, 20000, "someone.else@ybl")
    assert exc.value.code == "UPI_NOT_VERIFIED"
    with pytest.raises(AppError) as exc:
        await payment_service.request_payout(db, user, 60000)
    assert exc.value.code == "INSUFFICIENT_BALANCE"
    with pytest.raises(AppError) as exc:
        await payment_service.request_payout(db, user, 500)
    assert exc.value.code == "AMOUNT_OUT_OF_RANGE"

    payout = await payment_service.request_payout(db, user, 20000)
    assert payout.status == PayoutStatus.requested
    assert payout.upi_id == "priya@okicici"
    assert payout.debit_txn_id is not None
    assert await _balance(db, user) == 30000

    rejected = await payment_service.decide_payout(
        db, payout.id, approve=False, reference=None, reason="UPI id invalid"
    )
    assert rejected.status == PayoutStatus.rejected
    assert rejected.reversal_txn_id is not None
    assert await _balance(db, user) == 50000

    with pytest.raises(AppError) as exc:
        await payment_service.decide_payout(
            db, payout.id, approve=True, reference="UTR1", reason=None
        )
    assert exc.value.code == "INVALID_STATE"


async def test_payout_approval_requires_reference(db: AsyncSession) -> None:
    user = await make_user(db, balance_minor=50000)
    await verify_kyc(db, user)
    payout = await payment_service.request_payout(db, user, 20000)
    with pytest.raises(AppError) as exc:
        await payment_service.decide_payout(
            db, payout.id, approve=True, reference=None, reason=None
        )
    assert exc.value.code == "REFERENCE_REQUIRED"
    paid = await payment_service.decide_payout(
        db, payout.id, approve=True, reference="UTR123456", reason=None
    )
    assert paid.status == PayoutStatus.paid and paid.reference == "UTR123456"
    assert await _balance(db, user) == 30000  # stays debited


async def test_payout_http_and_admin(client: AsyncClient, db: AsyncSession) -> None:
    user = await make_user(db, balance_minor=50000)
    admin = await make_user(db, role=UserRole.admin)
    await verify_kyc(db, user, "user.name@okaxis")

    bad_upi = await client.post(
        "/api/v1/wallet/payouts",
        json={"amount_minor": 20000, "upi_id": "nope"},
        headers=_auth(user),
    )
    assert bad_upi.status_code == 422
    created = await client.post(
        "/api/v1/wallet/payouts",
        json={"amount_minor": 20000, "upi_id": "user.name@okaxis"},
        headers=_auth(user),
    )
    assert created.status_code == 201
    payout_id = created.json()["id"]

    mine = await client.get("/api/v1/wallet/payouts", headers=_auth(user))
    assert mine.json()["total"] == 1

    forbidden = await client.get("/api/v1/admin/payouts", headers=_auth(user))
    assert forbidden.status_code == 403
    queue = await client.get("/api/v1/admin/payouts?status=requested", headers=_auth(admin))
    assert payout_id in [p["id"] for p in queue.json()["items"]]

    decided = await client.post(
        f"/api/v1/admin/payouts/{payout_id}/decide",
        json={"approve": True, "reference": "UTR42"},
        headers=_auth(admin),
    )
    assert decided.status_code == 200
    assert decided.json()["status"] == "paid"
