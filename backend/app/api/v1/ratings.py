from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.common import ErrorResponse
from app.schemas.rating import RatingCreate, RatingResponse
from app.services import rating_service

router = APIRouter(prefix="/ratings", tags=["ratings"])


@router.post(
    "",
    response_model=RatingResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
    },
)
async def create_rating(data: RatingCreate, user: CurrentUser, db: DbSession) -> RatingResponse:
    """Rate the other party after a completed tweak (once per side)."""
    rating = await rating_service.create_rating(db, user.id, data)
    return RatingResponse.model_validate(rating)
