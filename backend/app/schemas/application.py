import uuid
from typing import Any

from pydantic import BaseModel, Field

from app.models.enums import ApplicationStatus
from app.schemas.common import ORMModel, UtcDatetime


class ApplicationCreate(BaseModel):
    why_prefer_message: str | None = None
    quoted_price_minor: int | None = Field(default=None, ge=0)
    selected_slots: list[dict[str, Any]] = Field(default_factory=list)


class OfferResponse(ORMModel):
    id: uuid.UUID
    application_id: uuid.UUID
    lister_quoted_price_minor: int
    message: str | None
    created_at: UtcDatetime


class ApplicationResponse(ORMModel):
    id: uuid.UUID
    tweak_id: uuid.UUID
    provider_user_id: uuid.UUID
    why_prefer_message: str | None
    quoted_price_minor: int | None
    selected_slots: list[dict[str, Any]]
    status: ApplicationStatus
    applied_at: UtcDatetime
    responded_at: UtcDatetime | None


class CounterQuoteRequest(BaseModel):
    lister_quoted_price_minor: int = Field(ge=0)
    message: str | None = None
