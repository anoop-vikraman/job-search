import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.security import create_access_token
from app.models.address import Address
from app.models.enums import NotificationType, PricingModel, TweakStatus, TweakType
from app.models.job import Job
from app.models.notification import Notification
from app.models.user import User
from app.schemas.saved_search import SavedSearchCreate
from app.schemas.tweak import TweakCreate, TweakUpdate
from app.services import block_service, saved_search_service, tweak_service
from tests.conftest import make_user

BENGALURU = (12.9716, 77.5946)
NEARBY = (12.9756, 77.6050)  # ~1.2 km
MYSURU = (12.2958, 76.6394)  # ~128 km


def _word() -> str:
    return f"zq{uuid.uuid4().hex[:8]}"


async def _addr(db: AsyncSession, user: User, lat: float, lng: float) -> uuid.UUID:
    a = Address(user_id=user.id, save_as="Home", formatted_address="x", latitude=lat, longitude=lng)
    db.add(a)
    await db.flush()
    return a.id


def _tweak(title: str, **over: object) -> TweakCreate:
    data: dict[str, object] = {
        "title": title,
        "description": "d",
        "category": "Plumbing",
        "tweak_type": TweakType.in_person,
        "pricing_model": PricingModel.fixed,
        "pricing_data": {"amount_minor": 5000},
        "status": TweakStatus.active,
    }
    data.update(over)
    return TweakCreate.model_validate(data)


async def _alerts(db: AsyncSession, user: User) -> list[Notification]:
    rows = await db.scalars(
        select(Notification).where(
            Notification.user_id == user.id,
            Notification.type == NotificationType.saved_search_match,
        )
    )
    return list(rows)


async def _run_match(db: AsyncSession, tweak_id: uuid.UUID) -> None:
    job = await db.scalar(
        select(Job).where(
            Job.kind == "match_saved_searches", Job.payload["tweak_id"].astext == str(tweak_id)
        )
    )
    assert job is not None, "posting an active tweak should enqueue matching"
    await saved_search_service.match_job(db, job.payload)


async def test_matching_alerts_once_per_user(db: AsyncSession) -> None:
    lister = await make_user(db)
    watcher = await make_user(db)
    other = await make_user(db)
    word = _word()
    await saved_search_service.create(
        db, watcher.id, SavedSearchCreate(name="Taps", search=word.upper(), category="Plumbing")
    )
    # A second matching search for the same user must not double-notify.
    await saved_search_service.create(db, watcher.id, SavedSearchCreate(name="Any", search=word))
    await saved_search_service.create(
        db, other.id, SavedSearchCreate(name="Painting", search=word, category="Painting")
    )

    tweak = await tweak_service.create_tweak(db, lister.id, _tweak(f"Fix {word} tap"))
    await _run_match(db, tweak.id)

    alerts = await _alerts(db, watcher)
    assert len(alerts) == 1 and alerts[0].tweak_id == tweak.id
    assert alerts[0].body == f"Fix {word} tap"
    assert await _alerts(db, other) == []


async def test_radius_and_owner_and_block_rules(db: AsyncSession) -> None:
    lister = await make_user(db)
    near_watcher = await make_user(db)
    far_watcher = await make_user(db)
    blocked_watcher = await make_user(db)
    word = _word()
    for user in (near_watcher, blocked_watcher):
        await saved_search_service.create(
            db,
            user.id,
            SavedSearchCreate(
                name="Near", search=word, lat=BENGALURU[0], lng=BENGALURU[1], radius_km=5
            ),
        )
    await saved_search_service.create(
        db,
        far_watcher.id,
        SavedSearchCreate(name="Mysuru", search=word, lat=MYSURU[0], lng=MYSURU[1], radius_km=10),
    )
    await saved_search_service.create(db, lister.id, SavedSearchCreate(name="Mine", search=word))
    await block_service.block(db, blocked_watcher.id, lister.id)

    addr = await _addr(db, lister, *NEARBY)
    tweak = await tweak_service.create_tweak(db, lister.id, _tweak(word, address_id=addr))
    await _run_match(db, tweak.id)

    assert len(await _alerts(db, near_watcher)) == 1
    assert await _alerts(db, far_watcher) == []
    assert await _alerts(db, blocked_watcher) == []
    assert await _alerts(db, lister) == []


async def test_draft_then_publish_triggers_matching(db: AsyncSession) -> None:
    lister = await make_user(db)
    watcher = await make_user(db)
    word = _word()
    await saved_search_service.create(db, watcher.id, SavedSearchCreate(name="w", search=word))
    tweak = await tweak_service.create_tweak(db, lister.id, _tweak(word, status=TweakStatus.draft))
    assert (
        await db.scalar(select(Job).where(Job.payload["tweak_id"].astext == str(tweak.id)))
    ) is None
    await tweak_service.update_tweak(
        db, tweak.id, lister.id, TweakUpdate(status=TweakStatus.active)
    )
    await _run_match(db, tweak.id)
    assert len(await _alerts(db, watcher)) == 1


async def test_validation_and_limits(db: AsyncSession) -> None:
    user = await make_user(db)
    with pytest.raises(AppError) as exc:
        await saved_search_service.create(db, user.id, SavedSearchCreate(name="x"))
    assert exc.value.code == "EMPTY_SEARCH"
    with pytest.raises(AppError) as exc:
        await saved_search_service.create(
            db, user.id, SavedSearchCreate(name="x", search="a", radius_km=5)
        )
    assert exc.value.code == "LOCATION_REQUIRED"
    for i in range(saved_search_service.MAX_PER_USER):
        await saved_search_service.create(db, user.id, SavedSearchCreate(name=f"s{i}", search="a"))
    with pytest.raises(AppError) as exc:
        await saved_search_service.create(
            db, user.id, SavedSearchCreate(name="one more", search="a")
        )
    assert exc.value.code == "TOO_MANY_SAVED_SEARCHES"


async def test_saved_search_http(client: AsyncClient, db: AsyncSession) -> None:
    user = await make_user(db)
    other = await make_user(db)
    headers = {"Authorization": f"Bearer {create_access_token(str(user.id), 'user')}"}
    created = await client.post(
        "/api/v1/saved-searches",
        json={"name": "Remote design", "search": "logo", "tweak_type": "remote"},
        headers=headers,
    )
    assert created.status_code == 201
    saved_id = created.json()["id"]
    listed = await client.get("/api/v1/saved-searches", headers=headers)
    assert [s["id"] for s in listed.json()] == [saved_id]

    other_headers = {"Authorization": f"Bearer {create_access_token(str(other.id), 'user')}"}
    assert (
        await client.delete(f"/api/v1/saved-searches/{saved_id}", headers=other_headers)
    ).status_code == 404
    assert (
        await client.delete(f"/api/v1/saved-searches/{saved_id}", headers=headers)
    ).status_code == 204
    assert (await client.get("/api/v1/saved-searches", headers=headers)).json() == []
