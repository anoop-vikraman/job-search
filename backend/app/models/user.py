import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, Enum, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import UserRole

if TYPE_CHECKING:
    from app.models.address import Address
    from app.models.wallet import Wallet


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("rating_avg >= 0 AND rating_avg <= 5", name="rating_range"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone_number: Mapped[str] = mapped_column(String(16), nullable=False)
    country_code: Mapped[str] = mapped_column(String(6), nullable=False, default="+91")
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str | None] = mapped_column(String(80))
    last_name: Mapped[str | None] = mapped_column(String(80))
    email: Mapped[str | None] = mapped_column(String(255))
    bio: Mapped[str | None] = mapped_column(Text)
    profile_picture_url: Mapped[str | None] = mapped_column(String(2048))
    skills: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    completed_categories: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, default=list
    )
    languages: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    date_of_birth: Mapped[str | None] = mapped_column(String(10))
    gender: Mapped[str | None] = mapped_column(String(20))
    rating_avg: Mapped[float] = mapped_column(Numeric(3, 2), nullable=False, default=0)
    rating_count: Mapped[int] = mapped_column(nullable=False, default=0)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"), nullable=False, default=UserRole.user
    )
    is_phone_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_banned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    banned_reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    addresses: Mapped[list["Address"]] = relationship(
        back_populates="user", lazy="raise", cascade="all, delete-orphan"
    )
    wallet: Mapped["Wallet | None"] = relationship(
        back_populates="user", lazy="raise", cascade="all, delete-orphan", uselist=False
    )
