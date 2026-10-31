from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.common import ErrorResponse
from app.schemas.user import UpdateUserRequest, UserProfile

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserProfile)
async def get_me(user: CurrentUser) -> UserProfile:
    """Return the authenticated user's profile."""
    return UserProfile.model_validate(user)


@router.patch("/me", response_model=UserProfile, responses={422: {"model": ErrorResponse}})
async def update_me(data: UpdateUserRequest, user: CurrentUser, db: DbSession) -> UserProfile:
    """Update the authenticated user's profile."""
    fields = data.model_dump(exclude_unset=True)
    for key, value in fields.items():
        setattr(user, key, value)
    await db.commit()
    await db.refresh(user)
    return UserProfile.model_validate(user)
