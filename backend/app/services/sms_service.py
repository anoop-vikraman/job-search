"""SMS delivery for OTPs. Provider chosen by SMS_PROVIDER: `console` (dev: logs the code),
`msg91` (India, DLT-registered template), or `twilio`."""

import logging

import httpx
from fastapi import status

from app.core.config import settings
from app.core.errors import AppError

logger = logging.getLogger(__name__)

# Tests swap this for an httpx.MockTransport.
transport: httpx.AsyncBaseTransport | None = None

MSG91_OTP_URL = "https://control.msg91.com/api/v5/otp"
TWILIO_URL = "https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"


def exposes_dev_code() -> bool:
    """Only the console provider may echo the code back (local development)."""
    return settings.SMS_PROVIDER == "console" and settings.OTP_DEV_ECHO


def _failed(detail: str) -> AppError:
    logger.error("OTP SMS failed: %s", detail)
    return AppError(
        status.HTTP_400_BAD_REQUEST, "SMS_SEND_FAILED", "Couldn't send the code. Try again."
    )


async def send_otp(country_code: str, phone: str, code: str) -> None:
    provider = settings.SMS_PROVIDER
    if provider == "console":
        logger.warning("OTP for %s %s: %s (console SMS provider)", country_code, phone, code)
        return

    digits = country_code.lstrip("+") + phone
    async with httpx.AsyncClient(timeout=10.0, transport=transport) as client:
        try:
            if provider == "msg91":
                if not settings.MSG91_AUTH_KEY or not settings.MSG91_TEMPLATE_ID:
                    raise _failed("MSG91_AUTH_KEY / MSG91_TEMPLATE_ID not set")
                res = await client.post(
                    MSG91_OTP_URL,
                    params={
                        "template_id": settings.MSG91_TEMPLATE_ID,
                        "mobile": digits,
                        "otp": code,
                    },
                    headers={"authkey": settings.MSG91_AUTH_KEY, "accept": "application/json"},
                )
                ok = res.status_code == 200 and res.json().get("type") == "success"
            else:  # twilio
                sid, token = settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN
                sender = settings.TWILIO_FROM
                if not sid or not token or not sender:
                    raise _failed("TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM not set")
                sender_field = "MessagingServiceSid" if sender.startswith("MG") else "From"
                res = await client.post(
                    TWILIO_URL.format(sid=sid),
                    data={
                        "To": f"+{digits}",
                        sender_field: sender,
                        "Body": f"{code} is your Tweak verification code. It expires in 5 minutes.",
                    },
                    auth=(sid, token),
                )
                ok = res.status_code in (200, 201)
        except httpx.HTTPError as exc:
            raise _failed(f"{provider} network error: {exc}") from exc
    if not ok:
        raise _failed(f"{provider} HTTP {res.status_code}: {res.text[:300]}")
