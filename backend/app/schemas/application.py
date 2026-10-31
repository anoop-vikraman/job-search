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
    agreed_price_minor: int | None
    platform_fee_minor: int | None
    selected_slots: list[dict[str, Any]]
    status: ApplicationStatus
    applied_at: UtcDatetime
    responded_at: UtcDatetime | None


class ProviderSummary(ORMModel):
    """Public applicant info shown on applicant cards."""

    id: uuid.UUID
    first_name: str | None
    last_name: str | None
    profile_picture_url: str | None
    skills: list[str]
    completed_categories: list[str]
    rating_avg: float
    rating_count: int


class ApplicationDetail(ApplicationResponse):
    """Application enriched with provider info and a counter-offer (for applicant lists)."""

    provider: ProviderSummary
    offer: OfferResponse | None = None


class MyApplication(ApplicationResponse):
    """An application the current user submitted, with the tweak's headline info."""

    tweak_title: str
    tweak_category: str
    tweak_status: str


class CounterQuoteRequest(BaseModel):
    lister_quoted_price_minor: int = Field(ge=0)
    message: str | None = None
