from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import observability
from app.core.config import settings
from app.core.security import create_access_token
from app.models.analytics import AnalyticsEvent
from app.models.enums import PricingModel, TweakStatus, TweakType, UserRole
from app.models.user import User
from app.schemas.application import ApplicationCreate
from app.schemas.tweak import TweakCreate
from app.services import analytics_service, application_service, tweak_service
from tests.conftest import make_user


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id), user.role.value)}"}


async def _events(db: AsyncSession, user: User) -> list[str]:
    rows = await db.scalars(
        select(AnalyticsEvent.name)
        .where(AnalyticsEvent.user_id == user.id)
        .order_by(AnalyticsEvent.created_at)
    )
    return list(rows)


async def test_business_actions_record_funnel_events(db: AsyncSession) -> None:
    lister = await make_user(db, balance_minor=100_000)
    provider = await make_user(db)
    tweak = await tweak_service.create_tweak(
        db,
        lister.id,
        TweakCreate(
            title="Fix fan",
            description="d",
            category="Electrical",
            tweak_type=TweakType.in_person,
            pricing_model=PricingModel.fixed,
            pricing_data={"amount_minor": 30_000},
            status=TweakStatus.active,
        ),
    )
    app = await application_service.apply(db, tweak.id, provider.id, ApplicationCreate())
    await application_service.accept(db, app.id, lister.id)
    await application_service.complete(db, app.id, lister.id)

    assert await _events(db, lister) == ["tweak_posted", "application_accepted"]
    assert await _events(db, provider) == ["application_submitted", "job_completed"]
    done = await db.scalar(
        select(AnalyticsEvent).where(
            AnalyticsEvent.name == "job_completed", AnalyticsEvent.tweak_id == tweak.id
        )
    )
    assert done is not None and done.properties["amount_minor"] == 30_000


async def test_funnel_report_shape(db: AsyncSession) -> None:
    user = await make_user(db)
    for name in ("tweak_posted", "tweak_posted", "application_submitted"):
        analytics_service.track(db, name, user_id=user.id)
    await db.flush()
    report = await analytics_service.funnel(db, days=1)
    names = [s["name"] for s in report["steps"]]
    assert names == list(analytics_service.FUNNEL)
    posted, applied = report["steps"][0], report["steps"][1]
    assert posted["count"] >= 2 and posted["conversion"] is None
    assert applied["count"] >= 1
    assert report["daily"] and "date" in report["daily"][-1]


async def test_client_events_whitelisted_and_sanitised(
    client: AsyncClient, db: AsyncSession
) -> None:
    user = await make_user(db)
    admin = await make_user(db, role=UserRole.admin)
    ok = await client.post(
        "/api/v1/analytics/events",
        json={
            "name": "search_performed",
            "properties": {"q": "x" * 500, "nested": {"a": 1}, "results": 7},
        },
        headers=_auth(user),
    )
    assert ok.status_code == 204
    event = await db.scalar(
        select(AnalyticsEvent).where(
            AnalyticsEvent.user_id == user.id, AnalyticsEvent.name == "search_performed"
        )
    )
    assert event is not None
    assert event.properties == {"q": "x" * 200, "results": 7}  # nested dropped, string capped

    bad = await client.post(
        "/api/v1/analytics/events", json={"name": "job_completed"}, headers=_auth(user)
    )
    assert bad.status_code == 422  # server-only events can't be forged

    funnel = await client.get("/api/v1/admin/analytics/funnel?days=7", headers=_auth(admin))
    assert funnel.status_code == 200 and funnel.json()["days"] == 7
    assert (
        await client.get("/api/v1/admin/analytics/funnel", headers=_auth(user))
    ).status_code == 403


def test_sentry_scrubs_secrets(monkeypatch: pytest.MonkeyPatch) -> None:
    event: dict[str, Any] = {
        "request": {
            "headers": {"Authorization": "Bearer abc", "X-Razorpay-Signature": "s", "Accept": "x"},
            "data": {"password": "p", "otp": "123456", "note": "fine"},
        }
    }
    out = observability._scrub(event, {})
    assert out["request"]["headers"] == {
        "Authorization": "[filtered]",
        "X-Razorpay-Signature": "[filtered]",
        "Accept": "x",
    }
    assert out["request"]["data"] == {"password": "[filtered]", "otp": "[filtered]", "note": "fine"}

    monkeypatch.setattr(settings, "SENTRY_DSN", None)
    assert observability.init_sentry("api") is False
