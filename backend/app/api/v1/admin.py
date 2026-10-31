import uuid
from collections.abc import Sequence
from dataclasses import asdict
from typing import Any, TypeVar

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute

from app.api.deps import CurrentUser, DbSession, require_admin
from app.core.errors import AppError
from app.db.base import Base
from app.models.application import Application
from app.models.enums import (
    DisputeStatus,
    KycStatus,
    PaymentStatus,
    PayoutStatus,
    RefundStatus,
    ReportStatus,
    ReportTarget,
    TweakStatus,
    UserRole,
)
from app.models.payment import Payout
from app.models.refund import Refund
from app.models.tweak import Tweak
from app.models.user import User
from app.models.wallet import WalletTransaction
from app.schemas.application import ApplicationResponse
from app.schemas.common import ErrorResponse, MessageResponse, Page
from app.schemas.dispute import DisputeResolve, DisputeResponse
from app.schemas.kyc import AdminKycSubmission, KycReview, KycSubmissionResponse
from app.schemas.moderation import AdminReportResponse, ReportResolve, ReportResponse
from app.schemas.payment import (
    AdminPaymentOrder,
    PayoutDecision,
    PayoutResponse,
    ReconcileReportResponse,
)
from app.schemas.refund import RefundDecision, RefundResponse
from app.schemas.tweak import TweakResponse
from app.schemas.user import AdminBanRequest, UserProfile
from app.schemas.wallet import TransactionResponse
from app.services import (
    analytics_service,
    dispute_service,
    kyc_service,
    payment_service,
    refund_service,
    report_service,
)

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
    conditions: Sequence[ColumnElement[bool]] = (),
) -> Page[R]:
    base = select(model)
    count_q = select(func.count()).select_from(model)
    for cond in conditions:
        base = base.where(cond)
        count_q = count_q.where(cond)
    total = await db.scalar(count_q) or 0
    rows = (
        await db.scalars(
            base.order_by(order_col.desc()).offset((page - 1) * limit).limit(limit)
        )
    ).all()
    items = [response_cls.model_validate(r) for r in rows]
    return Page(items=items, total=total, page=page, limit=limit)


@router.get("/users", response_model=Page[UserProfile])
async def list_users(
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, description="Match phone, first or last name"),
    role: UserRole | None = None,
    is_banned: bool | None = None,
) -> Page[UserProfile]:
    """List users (admin), with optional search and role/ban filters."""
    conditions: list[ColumnElement[bool]] = []
    if search:
        like = f"%{search}%"
        conditions.append(
            or_(
                User.phone_number.ilike(like),
                User.first_name.ilike(like),
                User.last_name.ilike(like),
            )
        )
    if role is not None:
        conditions.append(User.role == role)
    if is_banned is not None:
        conditions.append(User.is_banned.is_(is_banned))
    return await _paginate(db, User, UserProfile, page, limit, User.created_at, conditions)


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
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, description="Match title or category"),
    status_filter: TweakStatus | None = Query(None, alias="status"),
) -> Page[TweakResponse]:
    """List tweaks (admin moderation), with optional search and status filter."""
    conditions: list[ColumnElement[bool]] = []
    if search:
        like = f"%{search}%"
        conditions.append(or_(Tweak.title.ilike(like), Tweak.category.ilike(like)))
    if status_filter is not None:
        conditions.append(Tweak.status == status_filter)
    return await _paginate(db, Tweak, TweakResponse, page, limit, Tweak.created_at, conditions)


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
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: RefundStatus | None = Query(None, alias="status"),
) -> Page[RefundResponse]:
    """List refund requests (admin queue), optionally filtered by status."""
    conditions: list[ColumnElement[bool]] = []
    if status_filter is not None:
        conditions.append(Refund.status == status_filter)
    return await _paginate(db, Refund, RefundResponse, page, limit, Refund.created_at, conditions)


@router.get("/reports", response_model=Page[AdminReportResponse])
async def list_reports(
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: ReportStatus | None = Query(None, alias="status"),
    target_type: ReportTarget | None = None,
) -> Page[AdminReportResponse]:
    """Moderation queue: user/tweak/message reports, newest first."""
    rows, total = await report_service.list_reports(
        db, status_filter=status_filter, target_type=target_type, page=page, limit=limit
    )
    return Page(
        items=[
            AdminReportResponse(
                **ReportResponse.model_validate(r).model_dump(), open_reports_against_user=n
            )
            for r, n in rows
        ],
        total=total,
        page=page,
        limit=limit,
    )


@router.post(
    "/reports/{report_id}/resolve",
    response_model=ReportResponse,
    responses={404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
)
async def resolve_report(
    report_id: uuid.UUID, data: ReportResolve, admin: CurrentUser, db: DbSession
) -> ReportResponse:
    """Dismiss or action a report (optionally banning the user / closing the tweak).

    Settles every open report on the same target.
    """
    report = await report_service.resolve_report(db, report_id, admin.id, data)
    return ReportResponse.model_validate(report)


@router.get("/disputes", response_model=Page[DisputeResponse])
async def list_disputes(
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: DisputeStatus | None = Query(None, alias="status"),
) -> Page[DisputeResponse]:
    """Dispute queue (admin), newest first, optionally filtered by status."""
    rows, total = await dispute_service.list_disputes(
        db, status_filter=status_filter, page=page, limit=limit
    )
    return Page(
        items=[DisputeResponse.model_validate(d) for d in rows],
        total=total,
        page=page,
        limit=limit,
    )


@router.post(
    "/disputes/{dispute_id}/resolve",
    response_model=DisputeResponse,
    responses={
        400: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
)
async def resolve_dispute(
    dispute_id: uuid.UUID, data: DisputeResolve, admin: CurrentUser, db: DbSession
) -> DisputeResponse:
    """Settle a dispute: release to the provider, refund the lister, or split the escrow."""
    dispute = await dispute_service.resolve_dispute(db, dispute_id, admin.id, data)
    return DisputeResponse.model_validate(dispute)


class FunnelStep(BaseModel):
    name: str
    count: int
    unique_users: int
    conversion: float | None


class FunnelResponse(BaseModel):
    days: int
    steps: list[FunnelStep]
    other_events: dict[str, dict[str, int]]
    daily: list[dict[str, Any]]


@router.get("/analytics/funnel", response_model=FunnelResponse, status_code=status.HTTP_200_OK)
async def analytics_funnel(db: DbSession, days: int = Query(30, ge=1, le=365)) -> FunnelResponse:
    """Posted → applied → accepted → completed over the last `days`, with daily counts."""
    return FunnelResponse.model_validate(await analytics_service.funnel(db, days))


@router.get("/payments", response_model=Page[AdminPaymentOrder])
async def list_payment_orders(
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: PaymentStatus | None = Query(None, alias="status"),
    stuck: bool = False,
) -> Page[AdminPaymentOrder]:
    """Razorpay top-up orders; `stuck=true` shows unpaid orders older than 30 minutes."""
    rows, total = await payment_service.list_orders(
        db, status_filter=status_filter, stuck=stuck, page=page, limit=limit
    )
    return Page(
        items=[AdminPaymentOrder.model_validate(o) for o in rows],
        total=total,
        page=page,
        limit=limit,
    )


@router.post(
    "/payments/reconcile",
    response_model=ReconcileReportResponse,
    status_code=status.HTTP_200_OK,
)
async def reconcile_payments(db: DbSession) -> ReconcileReportResponse:
    """Run payment reconciliation now (it also runs daily in the worker)."""
    report = await payment_service.reconcile(db)
    return ReconcileReportResponse(**asdict(report))


@router.get("/kyc", response_model=Page[AdminKycSubmission])
async def list_kyc(
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: KycStatus | None = Query(None, alias="status"),
) -> Page[AdminKycSubmission]:
    """Identity verification queue, newest first."""
    rows, total = await kyc_service.list_submissions(
        db, status_filter=status_filter, page=page, limit=limit
    )
    return Page(
        items=[
            AdminKycSubmission(
                **KycSubmissionResponse.model_validate(k).model_dump(),
                user_id=u.id,
                user_name=" ".join(p for p in (u.first_name, u.last_name) if p) or "—",
                user_phone=f"{u.country_code} {u.phone_number}",
                document_count=len(k.document_keys),
            )
            for k, u in rows
        ],
        total=total,
        page=page,
        limit=limit,
    )


@router.get(
    "/kyc/{submission_id}/documents/{index}",
    response_class=FileResponse,
    responses={404: {"model": ErrorResponse}},
)
async def get_kyc_document(submission_id: uuid.UUID, index: int, db: DbSession) -> FileResponse:
    """Stream one identity document (admins only; never publicly served)."""
    path = await kyc_service.document_path(db, submission_id, index)
    return FileResponse(path, headers={"Cache-Control": "no-store"})


@router.post(
    "/kyc/{submission_id}/review",
    response_model=KycSubmissionResponse,
    responses={
        400: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
)
async def review_kyc(
    submission_id: uuid.UUID, data: KycReview, admin: CurrentUser, db: DbSession
) -> KycSubmissionResponse:
    """Approve (user becomes verified) or reject with a reason the user can fix."""
    submission = await kyc_service.review(
        db, submission_id, admin.id, approve=data.approve, reason=data.reason
    )
    return KycSubmissionResponse.model_validate(submission)


@router.get("/payouts", response_model=Page[PayoutResponse])
async def list_payouts(
    db: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: PayoutStatus | None = Query(None, alias="status"),
) -> Page[PayoutResponse]:
    """List withdrawal requests (admin queue), optionally filtered by status."""
    conditions: list[ColumnElement[bool]] = []
    if status_filter is not None:
        conditions.append(Payout.status == status_filter)
    return await _paginate(db, Payout, PayoutResponse, page, limit, Payout.created_at, conditions)


@router.post(
    "/payouts/{payout_id}/decide",
    response_model=PayoutResponse,
    responses={
        400: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
)
async def decide_payout(
    payout_id: uuid.UUID, data: PayoutDecision, db: DbSession
) -> PayoutResponse:
    """Mark a withdrawal sent (requires the transfer reference) or reject it (re-credits)."""
    payout = await payment_service.decide_payout(
        db, payout_id, approve=data.approve, reference=data.reference, reason=data.reason
    )
    return PayoutResponse.model_validate(payout)


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
