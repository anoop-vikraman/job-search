import uuid

from pydantic import BaseModel, Field

from app.models.enums import TweakType
from app.schemas.common import ORMModel, UtcDatetime


class SavedSearchCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    search: str | None = Field(None, max_length=100)
    category: str | None = Field(None, max_length=80)
    tweak_type: TweakType | None = None
    lat: float | None = Field(None, ge=-90, le=90)
    lng: float | None = Field(None, ge=-180, le=180)
    radius_km: float | None = Field(None, gt=0, le=500)


class SavedSearchResponse(ORMModel):
    id: uuid.UUID
    name: str
    search: str | None
    category: str | None
    tweak_type: TweakType | None
    lat: float | None
    lng: float | None
    radius_km: float | None
    last_matched_at: UtcDatetime | None
    created_at: UtcDatetime
