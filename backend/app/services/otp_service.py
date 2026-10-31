"""One-time passwords, stored in Postgres so they survive restarts and work across workers.

Codes are 6 digits, valid for 5 minutes, single use, and locked after 5 wrong attempts.
Only an HMAC of the code is stored. Delivery is `sms_service`.
"""

import hashlib
import hmac
import secrets
import time
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.otp import OtpCode
from app.services import job_service

OTP_TTL = timedelta(minutes=5)
MAX_ATTEMPTS = 5

# In-memory attempt store for request throttling (per process). Pair with a gateway or
# Redis-backed limiter when running several API workers.
_attempts: dict[str, list[float]] = {}


def _key(country_code: str, phone: str, request_type: str) -> str:
    return f"{country_code}:{phone}:{request_type}"


def _hash(key: str, code: str) -> str:
    return hmac.new(
        settings.SECRET_KEY.encode(), f"{key}:{code}".encode(), hashlib.sha256
    ).hexdigest()


async def generate(db: AsyncSession, country_code: str, phone: str, request_type: str) -> str:
    """Create a new code (invalidating earlier ones for the same phone+purpose)."""
    key = _key(country_code, phone, request_type)
    now = datetime.now(UTC)
    await db.execute(
        update(OtpCode)
        .where(OtpCode.key == key, OtpCode.consumed_at.is_(None))
        .values(consumed_at=now)
    )
    code = f"{secrets.randbelow(1_000_000):06d}"
    db.add(OtpCode(key=key, code_hash=_hash(key, code), expires_at=now + OTP_TTL))
    await db.commit()
    return code


async def verify(
    db: AsyncSession, country_code: str, phone: str, request_type: str, code: str
) -> bool:
    key = _key(country_code, phone, request_type)
    now = datetime.now(UTC)
    otp = await db.scalar(
        select(OtpCode)
        .where(OtpCode.key == key, OtpCode.consumed_at.is_(None), OtpCode.expires_at > now)
        .order_by(OtpCode.created_at.desc())
        .limit(1)
        .with_for_update()
    )
    if otp is None:
        await db.commit()
        return False
    otp.attempts += 1
    ok = hmac.compare_digest(otp.code_hash, _hash(key, code))
    if ok or otp.attempts >= MAX_ATTEMPTS:
        otp.consumed_at = now
    await db.commit()
    return ok


def rate_limited(key: str, max_attempts: int, window_seconds: int) -> bool:
    """Record an attempt for `key`; return True if the window limit is exceeded."""
    now = time.time()
    window = [t for t in _attempts.get(key, []) if now - t < window_seconds]
    window.append(now)
    _attempts[key] = window
    return len(window) > max_attempts


@job_service.periodic("purge_otp_codes", 6 * 3600)
async def purge_expired(db: AsyncSession) -> None:
    """Drop codes older than a day (they are useless after 5 minutes)."""
    await db.execute(
        delete(OtpCode).where(OtpCode.created_at < datetime.now(UTC) - timedelta(days=1))
    )
    await db.commit()
