import enum
import uuid
from typing import Any

from pydantic import BaseModel, Field

from app.models.enums import PricingModel, Recurrence, TweakStatus, TweakType
from app.schemas.common import ORMModel, UtcDatetime


class TweakCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    category: str = Field(min_length=1, max_length=80)
    tweak_type: TweakType
    address_id: uuid.UUID | None = None
    skills: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    media: list[dict[str, Any]] = Field(default_factory=list)
    schedule_preference: str | None = None
    schedule_data: dict[str, Any] | None = None
    pricing_model: PricingModel
    pricing_data: dict[str, Any] | None = None
    status: TweakStatus = TweakStatus.draft
    recurrence: Recurrence | None = None


class TweakUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    tweak_type: TweakType | None = None
    address_id: uuid.UUID | None = None
    skills: list[str] | None = None
    languages: list[str] | None = None
    media: list[dict[str, Any]] | None = None
    schedule_preference: str | None = None
    schedule_data: dict[str, Any] | None = None
    pricing_model: PricingModel | None = None
    pricing_data: dict[str, Any] | None = None
    status: TweakStatus | None = None
    # Send null to stop repeating.
    recurrence: Recurrence | None = None


class TweakResponse(ORMModel):
    id: uuid.UUID
    created_by_user_id: uuid.UUID
    title: str
    description: str
    category: str
    tweak_type: TweakType
    status: TweakStatus
    address_id: uuid.UUID | None
    skills: list[str]
    languages: list[str]
    media: list[dict[str, Any]]
    schedule_preference: str | None
    schedule_data: dict[str, Any] | None
    pricing_model: PricingModel
    pricing_data: dict[str, Any] | None
    price_minor: int | None
    currency: str
    created_at: UtcDatetime
    recurrence: Recurrence | None = None
    previous_occurrence_id: uuid.UUID | None = None
    # Only set on the feed when the caller passes lat/lng and the tweak has a geocoded address.
    distance_km: float | None = None
    # Feed only: in-person tweak location snapped to a ~550 m grid for map display.
    approx_lat: float | None = None
    approx_lng: float | None = None


class FeedSort(str, enum.Enum):
    newest = "newest"
    price_asc = "price_asc"
    price_desc = "price_desc"
    distance = "distance"
