import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.security import create_access_token
from app.models.address import Address
from app.models.enums import PricingModel, TweakStatus, TweakType
from app.models.tweak import Tweak
from app.schemas.tweak import FeedSort
from app.services import tweak_service
from tests.conftest import make_user

# Viewer stands on MG Road, Bengaluru.
HERE = (12.9756, 77.6050)
NEARBY = (12.9716, 77.5946)  # ~1.2 km away
MYSURU = (12.2958, 76.6394)  # ~128 km away


def _nonce() -> str:
    """A token no seeded tweak contains, so assertions ignore pre-existing dev data."""
    return f"zq{uuid.uuid4().hex[:8]}"


async def _address(db: AsyncSession, user_id: uuid.UUID, lat: float, lng: float) -> Address:
    address = Address(
        user_id=user_id, save_as="Home", formatted_address="x", latitude=lat, longitude=lng
    )
    db.add(address)
    await db.flush()
    return address


async def _tweak(
    db: AsyncSession,
    owner_id: uuid.UUID,
    *,
    title: str = "Job",
    description: str = "desc",
    category: str = "Plumbing",
    skills: list[str] | None = None,
    price: int | None = 50000,
    address_id: uuid.UUID | None = None,
    tweak_status: TweakStatus = TweakStatus.active,
) -> Tweak:
    tweak = Tweak(
        created_by_user_id=owner_id,
        title=title,
        description=description,
        category=category,
        tweak_type=TweakType.in_person,
        status=tweak_status,
        skills=skills or [],
        pricing_model=PricingModel.fixed,
        pricing_data={"amount_minor": price} if price else None,
        price_minor=price,
        address_id=address_id,
    )
    db.add(tweak)
    await db.flush()
    return tweak


async def test_search_matches_title_description_category_and_skills(db: AsyncSession) -> None:
    lister = await make_user(db)
    viewer = await make_user(db)
    word = _nonce()
    by_title = await _tweak(db, lister.id, title=f"Fix {word.upper()} now")
    by_desc = await _tweak(db, lister.id, description=f"the {word} drips")
    by_cat = await _tweak(db, lister.id, category=f"{word} repairs")
    by_skill = await _tweak(db, lister.id, skills=["pipe", f"{word}ware"])
    await _tweak(db, lister.id, title="Paint wall", category="Painting")
    await _tweak(db, lister.id, title=f"{word} draft", tweak_status=TweakStatus.draft)
    await _tweak(db, viewer.id, title=f"{word} of my own")

    rows, total = await tweak_service.list_feed(
        db, viewer_id=viewer.id, page=1, limit=50, search=f"  {word} "
    )
    assert {t.id for t, _ in rows} == {by_title.id, by_desc.id, by_cat.id, by_skill.id}
    assert total == 4


async def test_search_treats_wildcards_literally(db: AsyncSession) -> None:
    lister = await make_user(db)
    viewer = await make_user(db)
    word = _nonce()
    literal = await _tweak(db, lister.id, title=f"{word} 100% cotton")
    await _tweak(db, lister.id, title=f"{word} 1000 shirts")
    await _tweak(db, lister.id, title=f"{word} a_b")

    rows, _ = await tweak_service.list_feed(
        db, viewer_id=viewer.id, page=1, limit=50, search=f"{word} 100%"
    )
    assert [t.id for t, _ in rows] == [literal.id]
    rows, _ = await tweak_service.list_feed(
        db, viewer_id=viewer.id, page=1, limit=50, search=f"{word} 1_0"
    )
    assert rows == []


async def test_radius_filter_and_distance_sort(db: AsyncSession) -> None:
    lister = await make_user(db)
    viewer = await make_user(db)
    category = _nonce()
    near_addr = await _address(db, lister.id, *NEARBY)
    far_addr = await _address(db, lister.id, *MYSURU)
    far = await _tweak(db, lister.id, category=category, address_id=far_addr.id)
    near = await _tweak(db, lister.id, category=category, address_id=near_addr.id)
    no_location = await _tweak(db, lister.id, category=category)

    rows, total = await tweak_service.list_feed(
        db,
        viewer_id=viewer.id,
        page=1,
        limit=50,
        category=category,
        lat=HERE[0],
        lng=HERE[1],
        sort=FeedSort.distance,
    )
    assert [t.id for t, _ in rows] == [near.id, far.id, no_location.id]
    distances = [d for _, d in rows]
    assert distances[0] is not None and 1.0 < distances[0] < 1.5
    assert distances[1] is not None and 120 < distances[1] < 140
    assert distances[2] is None
    assert total == 3

    rows, total = await tweak_service.list_feed(
        db,
        viewer_id=viewer.id,
        page=1,
        limit=50,
        category=category,
        lat=HERE[0],
        lng=HERE[1],
        radius_km=10,
    )
    assert [t.id for t, _ in rows] == [near.id]
    assert total == 1


async def test_price_sorts_put_unpriced_last(db: AsyncSession) -> None:
    lister = await make_user(db)
    viewer = await make_user(db)
    category = _nonce()
    cheap = await _tweak(db, lister.id, category=category, price=10000)
    pricey = await _tweak(db, lister.id, category=category, price=90000)
    quote = await _tweak(db, lister.id, category=category, price=None)

    asc, _ = await tweak_service.list_feed(
        db, viewer_id=viewer.id, page=1, limit=50, category=category, sort=FeedSort.price_asc
    )
    desc, _ = await tweak_service.list_feed(
        db, viewer_id=viewer.id, page=1, limit=50, category=category, sort=FeedSort.price_desc
    )
    assert [t.id for t, _ in asc] == [cheap.id, pricey.id, quote.id]
    assert [t.id for t, _ in desc] == [pricey.id, cheap.id, quote.id]


@pytest.mark.parametrize(
    "kwargs",
    [
        {"lat": 12.0},
        {"lng": 77.0},
        {"radius_km": 5.0},
        {"sort": FeedSort.distance},
    ],
)
async def test_location_params_require_lat_and_lng(
    db: AsyncSession, kwargs: dict[str, object]
) -> None:
    viewer = await make_user(db)
    with pytest.raises(AppError) as exc:
        await tweak_service.list_feed(
            db,
            viewer_id=viewer.id,
            page=1,
            limit=20,
            **kwargs,  # type: ignore[arg-type]
        )
    assert exc.value.code == "LOCATION_REQUIRED"


async def test_feed_endpoint_returns_distance_km(client: AsyncClient, db: AsyncSession) -> None:
    lister = await make_user(db)
    viewer = await make_user(db)
    word = _nonce()
    addr = await _address(db, lister.id, *NEARBY)
    await _tweak(db, lister.id, title=f"Garden {word}", address_id=addr.id)
    headers = {"Authorization": f"Bearer {create_access_token(str(viewer.id), 'user')}"}

    res = await client.get(
        "/api/v1/tweaks",
        params={"search": word, "lat": HERE[0], "lng": HERE[1], "sort": "distance"},
        headers=headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 1
    assert 1.0 < body["items"][0]["distance_km"] < 1.5

    plain = await client.get("/api/v1/tweaks", params={"search": word}, headers=headers)
    assert plain.json()["items"][0]["distance_km"] is None

    bad = await client.get("/api/v1/tweaks", params={"radius_km": 5}, headers=headers)
    assert bad.status_code == 422
    assert bad.json()["code"] == "LOCATION_REQUIRED"
