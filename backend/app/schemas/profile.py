import uuid

from pydantic import BaseModel

from app.schemas.common import UtcDatetime


class PublicReview(BaseModel):
    score: int
    comment: str | None
    created_at: UtcDatetime
    reviewer_name: str
    tweak_title: str
    tweak_category: str


class PortfolioPhoto(BaseModel):
    url: str
    tweak_title: str
    tweak_category: str


class PublicProfile(BaseModel):
    """What anyone signed in can see about a user (no phone, email or exact last name)."""

    id: uuid.UUID
    display_name: str
    profile_picture_url: str | None
    bio: str | None
    skills: list[str]
    completed_categories: list[str]
    rating_avg: float
    rating_count: int
    completed_jobs: int
    # Identity verified (KYC approved).
    verified: bool
    member_since: UtcDatetime
    reviews: list[PublicReview]
    # Completion photos from finished jobs.
    portfolio: list[PortfolioPhoto]
