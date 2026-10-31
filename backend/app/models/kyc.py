import uuid
from datetime import datetime

from sqlalchemy import (
    CHAR,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import KycIdType, KycStatus


class KycSubmission(Base):
    """An identity verification request, reviewed manually by an admin.

    Documents live in the private KYC_DIR (never under /media); only the last four
    characters of the ID number are stored.
    """

    __tablename__ = "kyc_submissions"
    __table_args__ = (
        CheckConstraint("jsonb_typeof(document_keys) = 'array'", name="documents_array"),
        Index(
            "uq_kyc_one_pending_per_user",
            "user_id",
            unique=True,
            postgresql_where=text("status = 'pending'"),
        ),
        Index("ix_kyc_submissions_user_created", "user_id", "created_at"),
        Index("ix_kyc_submissions_status_created", "status", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[KycStatus] = mapped_column(
        Enum(KycStatus, name="kyc_status"), nullable=False, default=KycStatus.pending
    )
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    id_type: Mapped[KycIdType] = mapped_column(Enum(KycIdType, name="kyc_id_type"), nullable=False)
    id_number_last4: Mapped[str] = mapped_column(CHAR(4), nullable=False)
    document_keys: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    # Withdrawals go only to this UPI id once approved.
    upi_id: Mapped[str] = mapped_column(String(100), nullable=False)
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
