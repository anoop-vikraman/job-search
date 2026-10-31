import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.common import ErrorResponse
from app.schemas.saved_search import SavedSearchCreate, SavedSearchResponse
from app.services import saved_search_service

router = APIRouter(prefix="/saved-searches", tags=["saved-searches"])


@router.get("", response_model=list[SavedSearchResponse], status_code=status.HTTP_200_OK)
async def list_saved_searches(user: CurrentUser, db: DbSession) -> list[SavedSearchResponse]:
    """The caller's saved searches (new-tweak alerts)."""
    rows = await saved_search_service.list_for_user(db, user.id)
    return [SavedSearchResponse.model_validate(r) for r in rows]


@router.post(
    "",
    response_model=SavedSearchResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
    },
)
async def create_saved_search(
    data: SavedSearchCreate, user: CurrentUser, db: DbSession
) -> SavedSearchResponse:
    """Save feed filters; you'll be notified when a matching tweak is posted (max 10)."""
    saved = await saved_search_service.create(db, user.id, data)
    return SavedSearchResponse.model_validate(saved)


@router.delete(
    "/{saved_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: {"model": ErrorResponse}},
)
async def delete_saved_search(saved_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    """Delete an alert."""
    await saved_search_service.delete(db, user.id, saved_id)
