import uuid

from pydantic import BaseModel, Field

from app.models.enums import TxnStatus, TxnType
from app.schemas.common import ORMModel, UtcDatetime


class WalletResponse(ORMModel):
    id: uuid.UUID
    balance_minor: int
    held_minor: int
    currency: str


class TopupRequest(BaseModel):
    amount_minor: int = Field(gt=0)
    reference: str | None = None


class TransactionResponse(ORMModel):
    id: uuid.UUID
    type: TxnType
    status: TxnStatus
    amount_minor: int
    tweak_id: uuid.UUID | None
    application_id: uuid.UUID | None
    reference: str | None
    created_at: UtcDatetime
