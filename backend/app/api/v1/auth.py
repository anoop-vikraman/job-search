from typing import Any

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.auth import (
    GenerateOtpRequest,
    LoginRequest,
    RefreshRequest,
    SignupRequest,
    TokenResponse,
    VerifyOtpRequest,
)
from app.schemas.common import ErrorResponse, MessageResponse
from app.services import auth_service

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
async def generate_otp(data: GenerateOtpRequest) -> MessageResponse:
    """Send an OTP (stub: integrate an SMS provider)."""
    return MessageResponse(message="OTP sent.")


@router.post("/otp/verify", response_model=MessageResponse, responses=ERRORS)
async def verify_otp(data: VerifyOtpRequest) -> MessageResponse:
    """Verify an OTP (stub: validate against the SMS provider)."""
    return MessageResponse(message="OTP verified.")
