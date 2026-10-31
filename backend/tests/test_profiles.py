from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models.enums import PricingModel, TweakStatus, TweakType
from app.models.tweak import Tweak
from app.models.user import User
from app.schemas.application import ApplicationCreate, WorkSubmit
from app.schemas.rating import RatingCreate
from app.services import application_service, block_service, rating_service
from tests.conftest import make_user, verify_kyc


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id), 'user')}"}


async def _completed_job(db: AsyncSession, lister: User, provider: User, title: str) -> Tweak:
    tweak = Tweak(
        created_by_user_id=lister.id,
        title=title,
        description="d",
        category="Painting",
        tweak_type=TweakType.in_person,
        status=TweakStatus.active,
        pricing_model=PricingModel.fixed,
        price_minor=10000,
    )
    db.add(tweak)
    await db.flush()
    app = await application_service.apply(db, tweak.id, provider.id, ApplicationCreate())
    await application_service.accept(db, app.id, lister.id)
    await application_service.submit_work(
        db, app.id, provider.id, WorkSubmit(photo_urls=[f"/media/{title}.jpg"])
    )
    await application_service.complete(db, app.id, lister.id)
    return tweak


async def test_public_profile_shows_work_and_hides_private_fields(
    client: AsyncClient, db: AsyncSession
) -> None:
    provider = await make_user(db)
    provider.first_name, provider.last_name, provider.bio = "Priya", "Sharma", "Painter, 8 yrs"
    lister = await make_user(db, balance_minor=100000)
    lister.first_name, lister.last_name = "Liam", "Wong"
    viewer = await make_user(db)
    await verify_kyc(db, provider)

    tweak = await _completed_job(db, lister, provider, "kitchen")
    await _completed_job(db, lister, provider, "hall")
    await rating_service.create_rating(
        db,
        lister.id,
        RatingCreate(tweak_id=tweak.id, ratee_user_id=provider.id, score=5, comment="Spotless"),
    )

    res = await client.get(f"/api/v1/users/{provider.id}/public", headers=_auth(viewer))
    assert res.status_code == 200
    body = res.json()
    assert body["display_name"] == "Priya S."
    assert body["verified"] is True
    assert body["completed_jobs"] == 2
    assert body["rating_count"] == 1 and body["rating_avg"] == 5.0
    assert body["reviews"][0] == {
        "score": 5,
        "comment": "Spotless",
        "created_at": body["reviews"][0]["created_at"],
        "reviewer_name": "Liam W.",
        "tweak_title": "kitchen",
        "tweak_category": "Painting",
    }
    assert {p["url"] for p in body["portfolio"]} == {"/media/kitchen.jpg", "/media/hall.jpg"}
    for private in ("phone_number", "email", "last_name", "date_of_birth"):
        assert private not in body


async def test_blocked_and_banned_profiles_are_hidden(
    client: AsyncClient, db: AsyncSession
) -> None:
    alice = await make_user(db)
    bob = await make_user(db)
    banned = await make_user(db)
    banned.is_banned = True
    await db.flush()
    await block_service.block(db, bob.id, alice.id)

    assert (
        await client.get(f"/api/v1/users/{bob.id}/public", headers=_auth(alice))
    ).status_code == 404
    assert (
        await client.get(f"/api/v1/users/{alice.id}/public", headers=_auth(bob))
    ).status_code == 404
    assert (
        await client.get(f"/api/v1/users/{banned.id}/public", headers=_auth(alice))
    ).status_code == 404
    # You can always see your own.
    assert (
        await client.get(f"/api/v1/users/{alice.id}/public", headers=_auth(alice))
    ).status_code == 200
