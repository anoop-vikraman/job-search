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
    work_submitted_at: UtcDatetime | None = None
    completion_note: str | None = None
    completion_photos: list[dict[str, Any]] = Field(default_factory=list)
    auto_release_at: UtcDatetime | None = None


class WorkSubmit(BaseModel):
    note: str | None = Field(None, max_length=2000)
    # URLs returned by POST /media/upload (before/after photos).
    photo_urls: list[str] = Field(default_factory=list, max_length=10)


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
    # The lister's counter-offer, if they made one.
    offer: OfferResponse | None = None


class CounterQuoteRequest(BaseModel):
    lister_quoted_price_minor: int = Field(ge=0)
    message: str | None = None
