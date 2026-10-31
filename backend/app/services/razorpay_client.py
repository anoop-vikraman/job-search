"""Minimal async Razorpay REST client (orders, payments) + signature checks.

Uses httpx directly instead of the official SDK, which is synchronous (`requests`) and
would block the event loop.
"""

import hashlib
import hmac
from typing import Any

import httpx
from fastapi import status

from app.core.config import settings
from app.core.errors import AppError

# Tests swap this for an httpx.MockTransport.
transport: httpx.AsyncBaseTransport | None = None

Json = dict[str, Any]


def is_configured() -> bool:
    return bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)


def is_test_mode() -> bool:
    return (settings.RAZORPAY_KEY_ID or "").startswith("rzp_test_")


def _credentials() -> tuple[str, str]:
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise AppError(
            status.HTTP_400_BAD_REQUEST,
            "PAYMENTS_NOT_CONFIGURED",
            "Online payments are not configured.",
        )
    return settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET


async def _request(method: str, path: str, json: Json | None = None) -> Json:
    key_id, key_secret = _credentials()
    async with httpx.AsyncClient(
        base_url=settings.RAZORPAY_API_BASE,
        auth=(key_id, key_secret),
        timeout=15.0,
        transport=transport,
    ) as client:
        try:
            res = await client.request(method, path, json=json)
        except httpx.HTTPError as exc:
            raise AppError(
                status.HTTP_400_BAD_REQUEST,
                "PAYMENT_GATEWAY_ERROR",
                "Could not reach the payment gateway. Please try again.",
            ) from exc
    if res.status_code >= 400:
        try:
            description = res.json().get("error", {}).get("description") or res.text
        except ValueError:
            description = res.text
        raise AppError(
            status.HTTP_400_BAD_REQUEST,
            "PAYMENT_GATEWAY_ERROR",
            f"Payment gateway rejected the request: {description[:200]}",
        )
    body: Json = res.json()
    return body


async def create_order(
    amount_minor: int, currency: str, receipt: str, notes: dict[str, str]
) -> Json:
    return await _request(
        "POST",
        "/orders",
        {"amount": amount_minor, "currency": currency, "receipt": receipt[:40], "notes": notes},
    )


async def fetch_payment(payment_id: str) -> Json:
    return await _request("GET", f"/payments/{payment_id}")


async def capture_payment(payment_id: str, amount_minor: int, currency: str) -> Json:
    return await _request(
        "POST", f"/payments/{payment_id}/capture", {"amount": amount_minor, "currency": currency}
    )


def _hmac_hex(secret: str, message: bytes) -> str:
    return hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Checkout handler signature: HMAC-SHA256(order_id|payment_id, key_secret)."""
    _, key_secret = _credentials()
    expected = _hmac_hex(key_secret, f"{order_id}|{payment_id}".encode())
    return hmac.compare_digest(expected, signature)


def verify_webhook_signature(body: bytes, signature: str | None) -> bool:
    """X-Razorpay-Signature: HMAC-SHA256(raw body, webhook secret)."""
    if not settings.RAZORPAY_WEBHOOK_SECRET or not signature:
        return False
    expected = _hmac_hex(settings.RAZORPAY_WEBHOOK_SECRET, body)
    return hmac.compare_digest(expected, signature)
