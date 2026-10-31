import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.enums import UserRole
from app.schemas.auth import LoginRequest, SignupRequest
from app.services import auth_service
from tests.conftest import make_user

SIGNUP = SignupRequest(
    country_code="+91", phone_number="9123456780", password="Password@123", first_name="Zoe"
)


# ---- Refresh token rotation (service level) ----

async def test_refresh_rotates_and_revokes_old(db: AsyncSession) -> None:
    tokens = await auth_service.signup(db, SIGNUP)
    rotated = await auth_service.refresh(db, tokens.refresh_token)
    assert rotated.refresh_token != tokens.refresh_token

    # Reusing the original (now revoked) token is a replay -> family revoked.
    with pytest.raises(AppError) as exc:
        await auth_service.refresh(db, tokens.refresh_token)
    assert exc.value.code == "REFRESH_TOKEN_REUSED"


async def test_reuse_revokes_whole_family(db: AsyncSession) -> None:
    tokens = await auth_service.signup(db, SIGNUP)
    rotated = await auth_service.refresh(db, tokens.refresh_token)
    # Trigger reuse of the old token (revokes the family, including `rotated`).
    with pytest.raises(AppError):
        await auth_service.refresh(db, tokens.refresh_token)
    # The rotated token is now also dead.
    with pytest.raises(AppError) as exc:
        await auth_service.refresh(db, rotated.refresh_token)
    assert exc.value.code in ("REFRESH_TOKEN_REUSED", "INVALID_REFRESH_TOKEN")


async def test_wrong_password_rejected(db: AsyncSession) -> None:
    await auth_service.signup(db, SIGNUP)
    with pytest.raises(AppError) as exc:
        await auth_service.login(
            db,
            LoginRequest(country_code="+91", phone_number="9123456780", password="wrong"),
        )
    assert exc.value.code == "INVALID_CREDENTIALS"


async def test_duplicate_signup_rejected(db: AsyncSession) -> None:
    await auth_service.signup(db, SIGNUP)
    with pytest.raises(AppError) as exc:
        await auth_service.signup(db, SIGNUP)
    assert exc.value.code == "PHONE_ALREADY_EXISTS"


# ---- RBAC (HTTP level) ----

async def _token(db: AsyncSession, role: UserRole) -> str:
    from app.core.security import create_access_token

    user = await make_user(db, role=role)
    return create_access_token(subject=str(user.id), role=role.value)


async def test_admin_route_forbidden_for_user(db: AsyncSession, client: AsyncClient) -> None:
    token = await _token(db, UserRole.user)
    res = await client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert res.json()["code"] == "FORBIDDEN"


async def test_admin_route_allowed_for_admin(db: AsyncSession, client: AsyncClient) -> None:
    token = await _token(db, UserRole.admin)
    res = await client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert "items" in res.json()


async def test_missing_token_rejected(client: AsyncClient) -> None:
    res = await client.get("/api/v1/users/me")
    assert res.status_code == 401


async def test_banned_user_rejected(db: AsyncSession, client: AsyncClient) -> None:
    from app.core.security import create_access_token

    user = await make_user(db, role=UserRole.user)
    user.is_banned = True
    await db.flush()
    token = create_access_token(subject=str(user.id), role="user")
    res = await client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert res.json()["code"] == "USER_BANNED"
