import uuid

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel, UtcDatetime


class RatingCreate(BaseModel):
    tweak_id: uuid.UUID
    ratee_user_id: uuid.UUID
    score: int = Field(ge=1, le=5)
    comment: str | None = None


class RatingResponse(ORMModel):
    id: uuid.UUID
    tweak_id: uuid.UUID
    rater_user_id: uuid.UUID
    ratee_user_id: uuid.UUID
    score: int
    comment: str | None
    created_at: UtcDatetime
