import uuid
from typing import Any

from pydantic import BaseModel, Field

from app.models.enums import DisputeOutcome, DisputeStatus
from app.schemas.common import ORMModel, UtcDatetime


class DisputeCreate(BaseModel):
    reason: str = Field(min_length=10, max_length=2000)
    # URLs returned by POST /media/upload.
    evidence_urls: list[str] = Field(default_factory=list, max_length=10)


class DisputeResolve(BaseModel):
    outcome: DisputeOutcome
    # Required for `partial`: gross amount (minor units) the provider receives.
    provider_amount_minor: int | None = Field(None, ge=0)
    note: str | None = Field(None, max_length=1000)


class DisputeResponse(ORMModel):
    id: uuid.UUID
    application_id: uuid.UUID
    opened_by_user_id: uuid.UUID
    reason: str
    evidence: list[dict[str, Any]]
    status: DisputeStatus
    outcome: DisputeOutcome | None
    provider_amount_minor: int | None
    admin_note: str | None
    resolved_at: UtcDatetime | None
    created_at: UtcDatetime
