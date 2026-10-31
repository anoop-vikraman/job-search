from typing import Any

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.core.errors import AppError
from app.schemas.auth import (
    GenerateOtpRequest,
    LoginRequest,
    RefreshRequest,
    SignupRequest,
    TokenResponse,
    VerifyOtpRequest,
)
from app.schemas.common import ErrorResponse, MessageResponse
from app.services import auth_service, otp_service, sms_service


def _throttle(key: str) -> None:
    if otp_service.rate_limited(
        key, settings.RATE_LIMIT_MAX_ATTEMPTS, settings.RATE_LIMIT_WINDOW_SECONDS
    ):
        raise AppError(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "RATE_LIMITED",
            "Too many attempts. Please try again later.",
        )


router = APIRouter(prefix="/auth", tags=["auth"])

ERRORS: dict[int | str, dict[str, Any]] = {
    400: {"model": ErrorResponse},
    401: {"model": ErrorResponse},
    409: {"model": ErrorResponse},
    422: {"model": ErrorResponse},
}


@router.post(
    "/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED, responses=ERRORS
)
async def signup(data: SignupRequest, db: DbSession) -> TokenResponse:
    """Register a new user and return access + refresh tokens."""
    return await auth_service.signup(db, data)


@router.post("/login", response_model=TokenResponse, responses=ERRORS)
async def login(data: LoginRequest, db: DbSession) -> TokenResponse:
    """Authenticate with phone + password and return tokens."""
    _throttle(f"login:{data.country_code}:{data.phone_number}")
    return await auth_service.login(db, data)


@router.post("/refresh", response_model=TokenResponse, responses=ERRORS)
async def refresh(data: RefreshRequest, db: DbSession) -> TokenResponse:
    """Rotate a refresh token; reuse of a revoked token revokes the family."""
    return await auth_service.refresh(db, data.refresh_token)


@router.post("/logout", response_model=MessageResponse)
async def logout(user: CurrentUser, db: DbSession) -> MessageResponse:
    """Revoke all of the current user's refresh tokens."""
    await auth_service.logout(db, user.id)
    return MessageResponse(message="Logged out.")


@router.post("/otp/generate", response_model=MessageResponse, responses=ERRORS)
async def generate_otp(data: GenerateOtpRequest, db: DbSession) -> MessageResponse:
    """Generate a 6-digit OTP (5-min TTL, single use) and send it by SMS.

    With the dev `console` SMS provider the code is also returned in the message.
    """
    _throttle(f"otp:{data.country_code}:{data.phone_number}")
    code = await otp_service.generate(db, data.country_code, data.phone_number, data.request_type)
    await sms_service.send_otp(data.country_code, data.phone_number, code)
    if sms_service.exposes_dev_code():
        return MessageResponse(message=f"OTP sent. (dev code: {code})")
    return MessageResponse(message="OTP sent.")


@router.post("/otp/verify", response_model=MessageResponse, responses=ERRORS)
async def verify_otp(data: VerifyOtpRequest, db: DbSession) -> MessageResponse:
    """Verify an OTP. Codes are single use and lock after 5 wrong attempts."""
    _throttle(f"otp-verify:{data.country_code}:{data.phone_number}")
    ok = await otp_service.verify(
        db, data.country_code, data.phone_number, data.request_type, data.otp
    )
    if not ok:
        raise AppError(status.HTTP_400_BAD_REQUEST, "INVALID_OTP", "Invalid or expired OTP.")
    return MessageResponse(message="OTP verified.")
