from fastapi import APIRouter, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models.refund import Refund
from app.schemas.common import ErrorResponse
from app.schemas.refund import RefundCreate, RefundResponse
from app.services import refund_service

router = APIRouter(prefix="/refunds", tags=["refunds"])


@router.get("", response_model=list[RefundResponse])
async def list_my_refunds(user: CurrentUser, db: DbSession) -> list[RefundResponse]:
    """List refund requests created by the authenticated user."""
    rows = (
        await db.scalars(
            select(Refund)
            .where(Refund.requested_by_user_id == user.id)
            .order_by(Refund.created_at.desc())
        )
    ).all()
    return [RefundResponse.model_validate(r) for r in rows]


@router.post(
    "",
    response_model=RefundResponse,
    status_code=status.HTTP_201_CREATED,
    responses={403: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def request_refund(data: RefundCreate, user: CurrentUser, db: DbSession) -> RefundResponse:
    """Request a refund for an application the user is a party to."""
    refund = await refund_service.request_refund(db, user.id, data)
    return RefundResponse.model_validate(refund)
