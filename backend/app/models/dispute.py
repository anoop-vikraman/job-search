import uuid
from datetime import datetime
from typing import Any

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
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import DisputeOutcome, DisputeStatus


class Dispute(Base):
    """A disagreement about accepted work. Freezes escrow until an admin resolves it."""

    __tablename__ = "disputes"
    __table_args__ = (
        CheckConstraint("jsonb_typeof(evidence) = 'array'", name="evidence_array"),
        CheckConstraint(
            "provider_amount_minor IS NULL OR provider_amount_minor >= 0", name="amount_nonneg"
        ),
        # At most one open dispute per application.
        Index(
            "uq_disputes_open_application",
            "application_id",
            unique=True,
            postgresql_where=text("status = 'open'"),
        ),
        Index("ix_disputes_status_created", "status", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    opened_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    evidence: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)
    status: Mapped[DisputeStatus] = mapped_column(
        Enum(DisputeStatus, name="dispute_status"), nullable=False, default=DisputeStatus.open
    )
    outcome: Mapped[DisputeOutcome | None] = mapped_column(
        Enum(DisputeOutcome, name="dispute_outcome")
    )
    # Gross amount released to the provider (before platform fee) for release/split.
    provider_amount_minor: Mapped[int | None] = mapped_column(BigInteger)
    admin_note: Mapped[str | None] = mapped_column(Text)
    resolved_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
