from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.common import ErrorResponse
from app.schemas.moderation import ReportCreate, ReportResponse
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["moderation"])


@router.post(
    "",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
)
async def create_report(data: ReportCreate, user: CurrentUser, db: DbSession) -> ReportResponse:
    """Report a user, tweak or chat message to the moderation team."""
    report = await report_service.create_report(db, user.id, data)
    return ReportResponse.model_validate(report)
