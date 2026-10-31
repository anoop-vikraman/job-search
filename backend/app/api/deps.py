import uuid
from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.security import decode_token
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    if credentials is None:
        raise AppError(status.HTTP_401_UNAUTHORIZED, "UNAUTHORIZED", "Missing bearer token.")
    payload = decode_token(credentials.credentials)
    if payload is None or payload.get("type") != "access":
        raise AppError(status.HTTP_401_UNAUTHORIZED, "INVALID_TOKEN", "Invalid or expired token.")
    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError) as exc:
        raise AppError(status.HTTP_401_UNAUTHORIZED, "INVALID_TOKEN", "Invalid token.") from exc

    user = await db.get(User, user_id)
    if user is None:
        raise AppError(status.HTTP_401_UNAUTHORIZED, "INVALID_TOKEN", "User not found.")
    if user.is_banned:
        raise AppError(status.HTTP_403_FORBIDDEN, "USER_BANNED", "This account is banned.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*allowed: UserRole) -> Callable[[User], Awaitable[User]]:
    async def _checker(user: CurrentUser) -> User:
        if user.role not in allowed:
            raise AppError(status.HTTP_403_FORBIDDEN, "FORBIDDEN", "Insufficient permissions.")
        return user

    return _checker


require_admin = require_role(UserRole.admin)
