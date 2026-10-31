import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Enum, Float, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import TweakType


class SavedSearch(Base):
    """Feed filters a user wants alerts for when a matching tweak is posted."""

    __tablename__ = "saved_searches"
    __table_args__ = (
        CheckConstraint(
            "(lat IS NULL) = (lng IS NULL) AND (radius_km IS NULL OR lat IS NOT NULL)",
            name="location_complete",
        ),
        # Candidate lookup when a tweak goes live.
        Index("ix_saved_searches_category_type", "category", "tweak_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    search: Mapped[str | None] = mapped_column(String(100))
    category: Mapped[str | None] = mapped_column(String(80))
    tweak_type: Mapped[TweakType | None] = mapped_column(
        Enum(TweakType, name="tweak_type", create_type=False)
    )
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    radius_km: Mapped[float | None] = mapped_column(Float)
    last_matched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
