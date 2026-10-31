import uuid
from datetime import UTC, datetime

from fastapi import status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    new_jti,
    refresh_expiry,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse


async def _issue_tokens(db: AsyncSession, user: User, family_id: uuid.UUID) -> TokenResponse:
    raw_refresh = generate_refresh_token()
    token = RefreshToken(
        id=new_jti(),
        user_id=user.id,
        token_hash=hash_refresh_token(raw_refresh),
        family_id=family_id,
        expires_at=refresh_expiry(),
    )
    db.add(token)
    await db.flush()
    access = create_access_token(subject=str(user.id), role=user.role.value)
    return TokenResponse(access_token=access, refresh_token=raw_refresh)


async def signup(db: AsyncSession, data: SignupRequest) -> TokenResponse:
    existing = await db.scalar(
        select(User).where(
            User.country_code == data.country_code, User.phone_number == data.phone_number
        )
    )
    if existing is not None:
        raise AppError(
            status.HTTP_409_CONFLICT, "PHONE_ALREADY_EXISTS", "Phone already registered."
        )

    user = User(
        phone_number=data.phone_number,
        country_code=data.country_code,
        hashed_password=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        date_of_birth=data.date_of_birth,
        is_phone_verified=True,
    )
    db.add(user)
    await db.flush()
    db.add(Wallet(user_id=user.id))
    tokens = await _issue_tokens(db, user, family_id=uuid.uuid4())
    await db.commit()
    return tokens


async def login(db: AsyncSession, data: LoginRequest) -> TokenResponse:
    user = await db.scalar(
        select(User).where(
            User.country_code == data.country_code, User.phone_number == data.phone_number
        )
    )
    if user is None or not verify_password(data.password, user.hashed_password):
        raise AppError(status.HTTP_401_UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid credentials.")
    if user.is_banned:
        raise AppError(status.HTTP_403_FORBIDDEN, "USER_BANNED", "This account is banned.")
    tokens = await _issue_tokens(db, user, family_id=uuid.uuid4())
    await db.commit()
    return tokens


async def refresh(db: AsyncSession, raw_refresh: str) -> TokenResponse:
    token_hash = hash_refresh_token(raw_refresh)
    stored = await db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    if stored is None:
        raise AppError(status.HTTP_401_UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Invalid token.")

    # Reuse of a revoked token revokes the whole family (replay protection).
    if stored.revoked_at is not None:
        await _revoke_family(db, stored.family_id)
        await db.commit()
        raise AppError(
            status.HTTP_401_UNAUTHORIZED, "REFRESH_TOKEN_REUSED", "Token reuse detected."
        )

    if stored.expires_at <= datetime.now(UTC):
        raise AppError(status.HTTP_401_UNAUTHORIZED, "REFRESH_TOKEN_EXPIRED", "Token expired.")

    user = await db.get(User, stored.user_id)
    if user is None or user.is_banned:
        raise AppError(status.HTTP_401_UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Invalid token.")

    # Rotate: revoke current, issue a new one in the same family.
    new_tokens = await _issue_tokens(db, user, family_id=stored.family_id)
    stored.revoked_at = datetime.now(UTC)
    new_stored = await db.scalar(
        select(RefreshToken).where(
            RefreshToken.token_hash == hash_refresh_token(new_tokens.refresh_token)
        )
    )
    if new_stored is not None:
        stored.replaced_by_id = new_stored.id
    await db.commit()
    return new_tokens


async def logout(db: AsyncSession, user_id: uuid.UUID) -> None:
    tokens = (
        await db.scalars(
            select(RefreshToken).where(
                RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None)
            )
        )
    ).all()
    now = datetime.now(UTC)
    for t in tokens:
        t.revoked_at = now
    await db.commit()


async def _revoke_family(db: AsyncSession, family_id: uuid.UUID) -> None:
    tokens = (
        await db.scalars(
            select(RefreshToken).where(
                RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None)
            )
        )
    ).all()
    now = datetime.now(UTC)
    for t in tokens:
        t.revoked_at = now
