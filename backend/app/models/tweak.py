import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    CHAR,
    BigInteger,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import PricingModel, Recurrence, TweakStatus, TweakType

if TYPE_CHECKING:
    from app.models.application import Application


class Tweak(Base):
    __tablename__ = "tweaks"
    __table_args__ = (
        CheckConstraint("jsonb_typeof(media) = 'array'", name="media_array"),
        CheckConstraint("price_minor IS NULL OR price_minor >= 0", name="price_nonneg"),
        Index("ix_tweaks_feed", "status", "category", "created_at"),
        Index("ix_tweaks_feed_price", "status", "price_minor"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    tweak_type: Mapped[TweakType] = mapped_column(
        Enum(TweakType, name="tweak_type"), nullable=False
    )
    status: Mapped[TweakStatus] = mapped_column(
        Enum(TweakStatus, name="tweak_status"), nullable=False, default=TweakStatus.draft
    )
    address_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("addresses.id", ondelete="SET NULL"), index=True
    )
    skills: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    languages: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    media: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)
    schedule_preference: Mapped[str | None] = mapped_column(String(40))
    schedule_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    pricing_model: Mapped[PricingModel] = mapped_column(
        Enum(PricingModel, name="pricing_model"), nullable=False
    )
    pricing_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    price_minor: Mapped[int | None] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(CHAR(3), nullable=False, default="INR")
    # Repeat after completion (next occurrence is posted automatically). Null = one-off.
    recurrence: Mapped[Recurrence | None] = mapped_column(Enum(Recurrence, name="recurrence"))
    previous_occurrence_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tweaks.id", ondelete="SET NULL"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    applications: Mapped[list["Application"]] = relationship(
        back_populates="tweak", lazy="raise", cascade="all, delete-orphan"
    )
