import uuid

from pydantic import BaseModel, Field

from app.models.enums import PaymentStatus, PayoutStatus
from app.schemas.common import ORMModel, UtcDatetime
from app.schemas.wallet import TransactionResponse, WalletResponse


class TopupOrderCreate(BaseModel):
    amount_minor: int = Field(gt=0)


class TopupOrderResponse(BaseModel):
    """Everything the client needs to open Razorpay Checkout for this order."""

    id: uuid.UUID
    provider: str
    provider_order_id: str
    amount_minor: int
    currency: str
    key_id: str
    test_mode: bool


class TopupVerifyRequest(BaseModel):
    razorpay_order_id: str = Field(min_length=1, max_length=64)
    razorpay_payment_id: str = Field(min_length=1, max_length=64)
    razorpay_signature: str = Field(min_length=1, max_length=128)


class TopupVerifyResponse(BaseModel):
    status: PaymentStatus
    transaction: TransactionResponse
    wallet: WalletResponse


class PaymentOrderResponse(ORMModel):
    id: uuid.UUID
    provider: str
    provider_order_id: str
    provider_payment_id: str | None
    amount_minor: int
    currency: str
    status: PaymentStatus
    failure_reason: str | None
    created_at: UtcDatetime
    paid_at: UtcDatetime | None


class WebhookAck(BaseModel):
    status: str


class PayoutCreate(BaseModel):
    amount_minor: int = Field(gt=0)
    # Optional: defaults to the UPI id from the user's approved verification.
    upi_id: str | None = Field(
        None, pattern=r"^[A-Za-z0-9.\-_]{2,256}@[A-Za-z][A-Za-z0-9]{1,63}$", max_length=100
    )


class PayoutResponse(ORMModel):
    id: uuid.UUID
    user_id: uuid.UUID
    amount_minor: int
    currency: str
    upi_id: str
    status: PayoutStatus
    reference: str | None
    failure_reason: str | None
    created_at: UtcDatetime
    processed_at: UtcDatetime | None


class PayoutDecision(BaseModel):
    approve: bool
    # Transfer reference (UTR) when approving; reason when rejecting.
    reference: str | None = Field(None, max_length=120)
    reason: str | None = Field(None, max_length=500)
