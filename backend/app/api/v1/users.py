import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.chat import ChatParticipant
from app.schemas.common import ErrorResponse, MessageResponse
from app.schemas.moderation import BlockedUser
from app.schemas.profile import PublicProfile
from app.schemas.user import UpdateUserRequest, UserProfile
from app.services import block_service, profile_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserProfile)
async def get_me(user: CurrentUser) -> UserProfile:
    """Return the authenticated user's profile."""
    return UserProfile.model_validate(user)


@router.get(
    "/{user_id}/public",
    response_model=PublicProfile,
    status_code=status.HTTP_200_OK,
    responses={404: {"model": ErrorResponse}},
)
async def get_public_profile(user_id: uuid.UUID, user: CurrentUser, db: DbSession) -> PublicProfile:
    """Public profile: rating, reviews, completed jobs, portfolio photos, verified badge.

    404 for banned users and when either side blocked the other.
    """
    return await profile_service.get_public_profile(db, user_id, user.id)


@router.get("/me/blocks", response_model=list[BlockedUser], status_code=status.HTTP_200_OK)
async def list_blocks(user: CurrentUser, db: DbSession) -> list[BlockedUser]:
    """Users the caller has blocked."""
    rows = await block_service.list_blocked(db, user.id)
    return [
        BlockedUser(user=ChatParticipant.model_validate(u), blocked_at=b.created_at)
        for b, u in rows
    ]


@router.post(
    "/{user_id}/block",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    responses={400: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def block_user(user_id: uuid.UUID, user: CurrentUser, db: DbSession) -> MessageResponse:
    """Block a user (idempotent): hides their tweaks and stops applications and chat both ways."""
    await block_service.block(db, user.id, user_id)
    return MessageResponse(message="User blocked.")


@router.delete("/{user_id}/block", status_code=status.HTTP_204_NO_CONTENT)
async def unblock_user(user_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    """Remove a block (idempotent)."""
    await block_service.unblock(db, user.id, user_id)


@router.patch("/me", response_model=UserProfile, responses={422: {"model": ErrorResponse}})
async def update_me(data: UpdateUserRequest, user: CurrentUser, db: DbSession) -> UserProfile:
    """Update the authenticated user's profile."""
    fields = data.model_dump(exclude_unset=True)
    for key, value in fields.items():
        setattr(user, key, value)
    await db.commit()
    await db.refresh(user)
    return UserProfile.model_validate(user)
