import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ApplicationStatus

if TYPE_CHECKING:
    from app.models.tweak import Tweak


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        CheckConstraint("jsonb_typeof(selected_slots) = 'array'", name="slots_array"),
        # One active application per provider per tweak.
        Index(
            "uq_applications_active_one",
            "tweak_id",
            "provider_user_id",
            unique=True,
            postgresql_where=text("status IN ('pending', 'accepted')"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tweak_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tweaks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    why_prefer_message: Mapped[str | None] = mapped_column(Text)
    quoted_price_minor: Mapped[int | None] = mapped_column(BigInteger)
    agreed_price_minor: Mapped[int | None] = mapped_column(BigInteger)
    platform_fee_minor: Mapped[int | None] = mapped_column(BigInteger)
    selected_slots: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, default=list
    )
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus, name="application_status"),
        nullable=False,
        default=ApplicationStatus.pending,
    )
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    tweak: Mapped["Tweak"] = relationship(back_populates="applications", lazy="raise")
    offer: Mapped["Offer | None"] = relationship(
        back_populates="application", lazy="raise", cascade="all, delete-orphan", uselist=False
    )


class Offer(Base):
    __tablename__ = "offers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lister_quoted_price_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    application: Mapped["Application"] = relationship(back_populates="offer", lazy="raise")
