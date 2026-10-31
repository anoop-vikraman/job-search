import uuid
from datetime import datetime

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
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import PaymentStatus, PayoutStatus


class PaymentOrder(Base):
    """A gateway (Razorpay) order for a wallet top-up. Credited once, when paid."""

    __tablename__ = "payment_orders"
    __table_args__ = (
        CheckConstraint("amount_minor > 0", name="amount_positive"),
        Index("ix_payment_orders_user_created", "user_id", "created_at"),
        Index("ix_payment_orders_status_created", "status", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String(20), nullable=False, default="razorpay")
    provider_order_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    provider_payment_id: Mapped[str | None] = mapped_column(String(64), unique=True)
    amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(CHAR(3), nullable=False, default="INR")
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status"), nullable=False, default=PaymentStatus.created
    )
    failure_reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Last time reconciliation asked Razorpay about this order.
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Payout(Base):
    """A withdrawal request. The wallet is debited on request and re-credited if rejected."""

    __tablename__ = "payouts"
    __table_args__ = (
        CheckConstraint("amount_minor > 0", name="amount_positive"),
        Index("ix_payouts_user_created", "user_id", "created_at"),
        Index("ix_payouts_status_created", "status", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(CHAR(3), nullable=False, default="INR")
    upi_id: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[PayoutStatus] = mapped_column(
        Enum(PayoutStatus, name="payout_status"), nullable=False, default=PayoutStatus.requested
    )
    debit_txn_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wallet_transactions.id", ondelete="SET NULL"), index=True
    )
    reversal_txn_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wallet_transactions.id", ondelete="SET NULL"), index=True
    )
    # Bank/UPI transfer reference (UTR) recorded when an admin marks it paid.
    reference: Mapped[str | None] = mapped_column(String(120))
    failure_reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
