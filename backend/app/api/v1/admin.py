import uuid
from typing import TypeVar

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute

from app.api.deps import DbSession, require_admin
from app.core.errors import AppError
from app.db.base import Base
from app.models.application import Application
from app.models.enums import TweakStatus
from app.models.refund import Refund
from app.models.tweak import Tweak
from app.models.user import User
from app.models.wallet import WalletTransaction
from app.schemas.application import ApplicationResponse
from app.schemas.common import ErrorResponse, MessageResponse, Page
from app.schemas.refund import RefundDecision, RefundResponse
from app.schemas.tweak import TweakResponse
from app.schemas.user import AdminBanRequest, UserProfile
from app.schemas.wallet import TransactionResponse
from app.services import refund_service

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

M = TypeVar("M", bound=Base)
R = TypeVar("R", bound=BaseModel)


async def _paginate(
    db: AsyncSession,
    model: type[M],
    response_cls: type[R],
    page: int,
    limit: int,
    order_col: InstrumentedAttribute,
) -> Page[R]:
    total = await db.scalar(select(func.count()).select_from(model)) or 0
    rows = (
        await db.scalars(
            select(model).order_by(order_col.desc()).offset((page - 1) * limit).limit(limit)
        )
    ).all()
    items = [response_cls.model_validate(r) for r in rows]
    return Page(items=items, total=total, page=page, limit=limit)


@router.get("/users", response_model=Page[UserProfile])
async def list_users(
    db: DbSession, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)
) -> Page[UserProfile]:
    """List all users (admin)."""
    return await _paginate(db, User, UserProfile, page, limit, User.created_at)


@router.post(
    "/users/{user_id}/ban",
    response_model=MessageResponse,
    responses={404: {"model": ErrorResponse}},
)
async def ban_user(user_id: uuid.UUID, data: AdminBanRequest, db: DbSession) -> MessageResponse:
    """Ban or unban a user (admin)."""
    user = await db.get(User, user_id)
    if user is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "USER_NOT_FOUND", "User not found.")
    user.is_banned = data.is_banned
    user.banned_reason = data.banned_reason if data.is_banned else None
    await db.commit()
    return MessageResponse(message="Updated.")


@router.get("/tweaks", response_model=Page[TweakResponse])
async def list_tweaks(
    db: DbSession, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)
) -> Page[TweakResponse]:
    """List all tweaks (admin moderation)."""
    return await _paginate(db, Tweak, TweakResponse, page, limit, Tweak.created_at)


@router.post(
    "/tweaks/{tweak_id}/close",
    response_model=TweakResponse,
    responses={404: {"model": ErrorResponse}},
)
async def close_tweak(tweak_id: uuid.UUID, db: DbSession) -> TweakResponse:
    """Force-close a tweak (admin moderation)."""
    tweak = await db.get(Tweak, tweak_id)
    if tweak is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "TWEAK_NOT_FOUND", "Tweak not found.")
    tweak.status = TweakStatus.closed
    await db.commit()
    await db.refresh(tweak)
    return TweakResponse.model_validate(tweak)


@router.get("/applications", response_model=Page[ApplicationResponse])
async def list_applications(
    db: DbSession, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)
) -> Page[ApplicationResponse]:
    """List all applications (admin)."""
    return await _paginate(
        db, Application, ApplicationResponse, page, limit, Application.created_at
    )


@router.get("/transactions", response_model=Page[TransactionResponse])
async def list_transactions(
    db: DbSession, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)
) -> Page[TransactionResponse]:
    """List all wallet transactions (admin ledger)."""
    return await _paginate(
        db, WalletTransaction, TransactionResponse, page, limit, WalletTransaction.created_at
    )


@router.get("/refunds", response_model=Page[RefundResponse])
async def list_refunds(
    db: DbSession, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)
) -> Page[RefundResponse]:
    """List all refund requests (admin queue)."""
    return await _paginate(db, Refund, RefundResponse, page, limit, Refund.created_at)


@router.post(
    "/refunds/{refund_id}/decide",
    response_model=RefundResponse,
    responses={404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
)
async def decide_refund(
    refund_id: uuid.UUID, data: RefundDecision, db: DbSession
) -> RefundResponse:
    """Approve (reverses escrow to lister) or reject a refund request (admin)."""
    refund = await refund_service.decide_refund(db, refund_id, data.approve)
    return RefundResponse.model_validate(refund)
