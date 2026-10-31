import uuid

from pydantic import BaseModel, Field, field_validator

from app.models.enums import TxnStatus, TxnType
from app.schemas.common import ORMModel, UtcDatetime

RESERVED_REFERENCE_PREFIXES = ("razorpay:", "payout:", "payout-reversal:")


class WalletResponse(ORMModel):
    id: uuid.UUID
    balance_minor: int
    held_minor: int
    currency: str


class TopupRequest(BaseModel):
    amount_minor: int = Field(gt=0)
    reference: str | None = Field(None, max_length=120)

    @field_validator("reference")
    @classmethod
    def _not_reserved(cls, v: str | None) -> str | None:
        # Gateway and payout ledger entries own these prefixes; a client-chosen reference
        # must not pre-empt (and so block) a real payment's idempotency key.
        if v is not None and v.startswith(RESERVED_REFERENCE_PREFIXES):
            raise ValueError("This reference prefix is reserved.")
        return v


class TransactionResponse(ORMModel):
    id: uuid.UUID
    type: TxnType
    status: TxnStatus
    amount_minor: int
    tweak_id: uuid.UUID | None
    application_id: uuid.UUID | None
    reference: str | None
    created_at: UtcDatetime
