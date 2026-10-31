from datetime import date as date_type
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


class MediaItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["image", "audio"]
    url: Annotated[str, StringConstraints(pattern=r"^https?://")]
    width: int | None = None
    height: int | None = None
    duration_ms: int | None = None


class TimeSlot(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: date_type | None = None
    start: Annotated[str, StringConstraints(pattern=r"^\d{2}:\d{2}$")]
    end: Annotated[str, StringConstraints(pattern=r"^\d{2}:\d{2}$")]
    status: Literal["default", "modified"] | None = None


class HourlyPricing(BaseModel):
    model_config = ConfigDict(extra="forbid")
    rate_per_hour_minor: Annotated[int, Field(ge=0)]
    estimated_hours: Annotated[float, Field(gt=0)]


class QuantityPricing(BaseModel):
    model_config = ConfigDict(extra="forbid")
    unit_label: Annotated[str, StringConstraints(min_length=1, max_length=40)]
    unit_price_minor: Annotated[int, Field(ge=0)]
    quantity: Annotated[int, Field(ge=1)]


class FixedPricing(BaseModel):
    model_config = ConfigDict(extra="forbid")
    amount_minor: Annotated[int, Field(ge=0)]


def resolve_price_minor(pricing_model: str, pricing_data: dict | None) -> int | None:
    """Derive the resolved price from a validated pricing payload (None for `quote`)."""
    if pricing_model == "quote" or pricing_data is None:
        return None
    if pricing_model == "fixed":
        return FixedPricing(**pricing_data).amount_minor
    if pricing_model == "hourly":
        h = HourlyPricing(**pricing_data)
        return int(round(h.rate_per_hour_minor * h.estimated_hours))
    if pricing_model == "quantity":
        q = QuantityPricing(**pricing_data)
        return q.unit_price_minor * q.quantity
    return None
