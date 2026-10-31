import uuid

from pydantic import BaseModel, Field

from app.models.enums import KycIdType, KycStatus
from app.schemas.common import ORMModel, UtcDatetime


class KycSubmissionResponse(ORMModel):
    id: uuid.UUID
    status: KycStatus
    full_name: str
    id_type: KycIdType
    id_number_last4: str
    upi_id: str
    rejection_reason: str | None
    reviewed_at: UtcDatetime | None
    created_at: UtcDatetime


class KycStatusResponse(BaseModel):
    verified: bool
    verified_at: UtcDatetime | None
    latest: KycSubmissionResponse | None


class AdminKycSubmission(KycSubmissionResponse):
    user_id: uuid.UUID
    user_name: str
    user_phone: str
    document_count: int


class KycReview(BaseModel):
    approve: bool
    reason: str | None = Field(None, max_length=500)
