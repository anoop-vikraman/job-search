import uuid

from pydantic import BaseModel, Field

from app.models.enums import RefundStatus
from app.schemas.common import ORMModel, UtcDatetime


class RefundCreate(BaseModel):
    application_id: uuid.UUID
    amount_minor: int = Field(gt=0)
    reason: str | None = None


class RefundResponse(ORMModel):
    id: uuid.UUID
    application_id: uuid.UUID
    requested_by_user_id: uuid.UUID
    amount_minor: int
    reason: str | None
    status: RefundStatus
    processed_at: UtcDatetime | None
    created_at: UtcDatetime


class RefundDecision(BaseModel):
    approve: bool
