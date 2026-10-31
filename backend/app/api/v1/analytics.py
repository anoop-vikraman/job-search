from typing import Any

from fastapi import APIRouter, status
from pydantic import BaseModel, Field, field_validator

from app.api.deps import CurrentUser, DbSession
from app.schemas.common import ErrorResponse
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


class ClientEvent(BaseModel):
    name: str
    properties: dict[str, Any] = Field(default_factory=dict)

    @field_validator("name")
    @classmethod
    def _allowed(cls, v: str) -> str:
        if v not in analytics_service.CLIENT_EVENTS:
            raise ValueError(f"Unknown event; allowed: {sorted(analytics_service.CLIENT_EVENTS)}")
        return v


@router.post(
    "/events",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={422: {"model": ErrorResponse}},
)
async def track_event(data: ClientEvent, user: CurrentUser, db: DbSession) -> None:
    """Record a whitelisted client event (screen views, searches) for the signed-in user."""
    analytics_service.track(
        db,
        data.name,
        user_id=user.id,
        properties=analytics_service.clean_properties(data.properties),
    )
    await db.commit()
