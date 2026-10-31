import uuid

from pydantic import BaseModel

from app.models.enums import UserRole
from app.schemas.common import ORMModel, UtcDatetime


class UserProfile(ORMModel):
    id: uuid.UUID
    first_name: str | None
    last_name: str | None
    email: str | None
    phone_number: str
    country_code: str
    date_of_birth: str | None
    gender: str | None
    bio: str | None
    profile_picture_url: str | None
    skills: list[str]
    completed_categories: list[str]
    rating_avg: float
    rating_count: int
    role: UserRole
    is_banned: bool
    created_at: UtcDatetime


class UpdateUserRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    bio: str | None = None
    profile_picture_url: str | None = None
    skills: list[str] | None = None


class AdminBanRequest(BaseModel):
    is_banned: bool
    banned_reason: str | None = None
