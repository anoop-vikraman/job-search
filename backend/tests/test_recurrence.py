from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import PricingModel, Recurrence, TweakStatus, TweakType
from app.models.job import Job
from app.models.tweak import Tweak
from app.schemas.application import ApplicationCreate
from app.schemas.tweak import TweakCreate, TweakUpdate
from app.services import application_service, recurrence_service, tweak_service
from tests.conftest import make_user


def test_shift_keeps_formats() -> None:
    schedule = {
        "date": "2026-11-05",
        "deadline": "2026-11-07T18:30:00.000Z",
        "timeSlots": [{"start": "10:00", "end": "12:00"}],
        "fewDaysSlots": [{"date": "2026-11-05", "start": "9:00", "end": "11:00"}],
        "slotType": "availability",
    }
    out = recurrence_service.shift_schedule(schedule, 7)
    assert out == {
        "date": "2026-11-12",
        "deadline": "2026-11-14T18:30:00.000Z",
        "timeSlots": [{"start": "10:00", "end": "12:00"}],
        "fewDaysSlots": [{"date": "2026-11-12", "start": "9:00", "end": "11:00"}],
        "slotType": "availability",
    }
    assert schedule["date"] == "2026-11-05"  # input untouched


def test_next_schedule_skips_past_occurrences() -> None:
    today = date(2026, 11, 30)
    out = recurrence_service.next_schedule({"date": "2026-11-05"}, Recurrence.weekly, today)
    assert out == {"date": "2026-12-03"}  # 4 weeks later is the first date >= today
    out = recurrence_service.next_schedule({"date": "2026-11-28"}, Recurrence.monthly, today)
    assert out == {"date": "2026-12-28"}


async def test_completing_a_recurring_tweak_posts_the_next_one(db: AsyncSession) -> None:
    lister = await make_user(db, balance_minor=100_000)
    provider = await make_user(db)
    soon = (datetime.now(UTC).date() + timedelta(days=1)).isoformat()
    tweak = await tweak_service.create_tweak(
        db,
        lister.id,
        TweakCreate(
            title="Weekly cleaning",
            description="2BHK",
            category="Cleaning",
            tweak_type=TweakType.in_person,
            pricing_model=PricingModel.fixed,
            pricing_data={"amount_minor": 20_000},
            schedule_preference="one_day",
            schedule_data={"date": soon, "timeSlots": [{"start": "09:00", "end": "11:00"}]},
            status=TweakStatus.active,
            recurrence=Recurrence.weekly,
        ),
    )
    app = await application_service.apply(db, tweak.id, provider.id, ApplicationCreate())
    await application_service.accept(db, app.id, lister.id)
    await application_service.complete(db, app.id, lister.id)

    nxt = await db.scalar(select(Tweak).where(Tweak.previous_occurrence_id == tweak.id))
    assert nxt is not None
    assert nxt.status == TweakStatus.active and nxt.recurrence == Recurrence.weekly
    assert nxt.price_minor == 20_000 and nxt.title == "Weekly cleaning"
    expected = (date.fromisoformat(soon) + timedelta(days=7)).isoformat()
    assert nxt.schedule_data is not None and nxt.schedule_data["date"] == expected
    alert_job = await db.scalar(
        select(Job).where(
            Job.kind == "match_saved_searches", Job.payload["tweak_id"].astext == str(nxt.id)
        )
    )
    assert alert_job is not None

    # Stopping the series: the next one completes without a follow-up.
    await tweak_service.update_tweak(db, nxt.id, lister.id, TweakUpdate(recurrence=None))
    await db.refresh(nxt)
    assert nxt.recurrence is None


async def test_one_off_tweaks_do_not_repeat(db: AsyncSession) -> None:
    lister = await make_user(db, balance_minor=100_000)
    provider = await make_user(db)
    tweak = Tweak(
        created_by_user_id=lister.id,
        title="Once",
        description="d",
        category="Cleaning",
        tweak_type=TweakType.in_person,
        status=TweakStatus.active,
        pricing_model=PricingModel.fixed,
        price_minor=10_000,
    )
    db.add(tweak)
    await db.flush()
    app = await application_service.apply(db, tweak.id, provider.id, ApplicationCreate())
    await application_service.accept(db, app.id, lister.id)
    await application_service.complete(db, app.id, lister.id)
    assert await db.scalar(select(Tweak).where(Tweak.previous_occurrence_id == tweak.id)) is None
