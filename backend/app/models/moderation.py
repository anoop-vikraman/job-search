import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import ReportReason, ReportStatus, ReportTarget


class Report(Base):
    """A user's report about another user, a tweak, or a chat message (admin queue)."""

    __tablename__ = "reports"
    __table_args__ = (
        # One open report per reporter per target (re-reporting after a decision is fine).
        Index(
            "uq_reports_open_per_target",
            "reporter_user_id",
            "target_type",
            "target_id",
            unique=True,
            postgresql_where=text("status = 'open'"),
        ),
        Index("ix_reports_status_created", "status", "created_at"),
        Index("ix_reports_target", "target_type", "target_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_type: Mapped[ReportTarget] = mapped_column(
        Enum(ReportTarget, name="report_target"), nullable=False
    )
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    # The user responsible for the target (the user, tweak owner, or message sender).
    target_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reason: Mapped[ReportReason] = mapped_column(
        Enum(ReportReason, name="report_reason"), nullable=False
    )
    details: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, name="report_status"), nullable=False, default=ReportStatus.open
    )
    admin_note: Mapped[str | None] = mapped_column(Text)
    resolved_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Block(Base):
    """`blocker` no longer sees or deals with `blocked` (and vice versa)."""

    __tablename__ = "blocks"
    __table_args__ = (
        UniqueConstraint("blocker_user_id", "blocked_user_id", name="pair"),
        CheckConstraint("blocker_user_id <> blocked_user_id", name="not_self"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    blocker_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    blocked_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
