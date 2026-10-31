import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.common import ErrorResponse, MessageResponse
from app.schemas.watchlist import WatchlistItem
from app.services import watchlist_service

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


@router.get("", response_model=list[WatchlistItem])
async def list_watchlist(user: CurrentUser, db: DbSession) -> list[WatchlistItem]:
    """Tweaks the authenticated user has watchlisted."""
    rows = await watchlist_service.list_tweaks(db, user.id)
    return [WatchlistItem.model_validate(t) for t in rows]


@router.post(
    "/{tweak_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    responses={404: {"model": ErrorResponse}},
)
async def add_to_watchlist(
    tweak_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> MessageResponse:
    """Add a tweak to the watchlist (idempotent)."""
    await watchlist_service.add(db, user.id, tweak_id)
    return MessageResponse(message="Added.")


@router.delete("/{tweak_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_watchlist(tweak_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    """Remove a tweak from the watchlist."""
    await watchlist_service.remove(db, user.id, tweak_id)
