from datetime import UTC, datetime
from typing import Annotated, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, PlainSerializer

T = TypeVar("T")

# Serialize datetimes as ISO-8601 UTC ending in `Z` (API guideline).
UtcDatetime = Annotated[
    datetime,
    # astimezone(UTC), not astimezone(): the bare form converts to the server's local zone.
    PlainSerializer(
        lambda d: d.astimezone(UTC).isoformat().replace("+00:00", "Z"), return_type=str
    ),
]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    limit: int


class CursorPage(Page[T], Generic[T]):
    """Page plus a keyset cursor; pass `next_cursor` back as `cursor` (null at the end)."""

    next_cursor: str | None = None


class ErrorResponse(BaseModel):
    detail: str
    code: str


class MessageResponse(BaseModel):
    success: bool = True
    message: str | None = None
