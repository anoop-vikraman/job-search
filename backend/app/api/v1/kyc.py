from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile, status

from app.api.deps import CurrentUser, DbSession
from app.models.enums import KycIdType
from app.schemas.common import ErrorResponse
from app.schemas.kyc import KycStatusResponse, KycSubmissionResponse
from app.services import kyc_service

router = APIRouter(prefix="/kyc", tags=["kyc"])


@router.get("", response_model=KycStatusResponse, status_code=status.HTTP_200_OK)
async def get_kyc_status(user: CurrentUser, db: DbSession) -> KycStatusResponse:
    """Whether the caller is verified, plus their latest submission (if any)."""
    latest = await kyc_service.latest(db, user.id)
    return KycStatusResponse(
        verified=user.kyc_verified_at is not None,
        verified_at=user.kyc_verified_at,
        latest=KycSubmissionResponse.model_validate(latest) if latest else None,
    )


@router.post(
    "",
    response_model=KycSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
    },
)
async def submit_kyc(
    user: CurrentUser,
    db: DbSession,
    full_name: Annotated[str, Form(max_length=160)],
    id_type: Annotated[KycIdType, Form()],
    id_number: Annotated[str, Form(max_length=40)],
    upi_id: Annotated[str, Form(max_length=100)],
    documents: Annotated[list[UploadFile], File(description="1-3 images/PDF of the ID")],
) -> KycSubmissionResponse:
    """Submit identity documents for manual review (multipart form)."""
    submission = await kyc_service.submit(
        db,
        user,
        full_name=full_name,
        id_type=id_type,
        id_number=id_number,
        upi_id=upi_id,
        documents=documents,
    )
    return KycSubmissionResponse.model_validate(submission)
