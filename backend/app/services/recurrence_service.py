"""Recurring tweaks: when a recurring job completes, post the next occurrence.

The copy keeps the details and pricing, gets its schedule dates moved forward by the
interval (repeatedly, until the first date is today or later), and goes live straight away
(so saved-search alerts fire). Turning recurrence off on the new tweak stops the series.
"""

import copy
import re
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application
from app.models.enums import NotificationType, Recurrence, TweakStatus
from app.models.tweak import Tweak
from app.services import application_service, job_service, notification_service

INTERVAL_DAYS = {Recurrence.weekly: 7, Recurrence.biweekly: 14, Recurrence.monthly: 30}
DATE_KEYS = ("date", "startDate", "endDate", "closingDate", "deadline")
SLOT_KEYS = ("fewDaysSlots", "deadlineSlots", "timeSlots")
_DATE_ONLY = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _shift_value(value: Any, days: int) -> Any:
    """Shift an ISO date or datetime string, keeping its original format."""
    if not isinstance(value, str) or not value:
        return value
    try:
        if _DATE_ONLY.match(value):
            return (date.fromisoformat(value) + timedelta(days=days)).isoformat()
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return value
    shifted = (parsed + timedelta(days=days)).isoformat()
    if value.endswith("Z"):
        shifted = shifted.replace("+00:00", "Z")
        # JS toISOString() has millisecond precision.
        if "." in value and "." not in shifted:
            shifted = shifted.replace("Z", ".000Z")
    return shifted


def shift_schedule(schedule: dict[str, Any] | None, days: int) -> dict[str, Any] | None:
    if not schedule:
        return schedule
    out = copy.deepcopy(schedule)
    for key in DATE_KEYS:
        if key in out:
            out[key] = _shift_value(out[key], days)
    for key in SLOT_KEYS:
        slots = out.get(key)
        if isinstance(slots, list):
            for slot in slots:
                if isinstance(slot, dict) and "date" in slot:
                    slot["date"] = _shift_value(slot["date"], days)
    return out


def _first_date(schedule: dict[str, Any] | None) -> date | None:
    if not schedule:
        return None
    candidates: list[Any] = [schedule.get(k) for k in DATE_KEYS]
    for key in SLOT_KEYS:
        for slot in schedule.get(key) or []:
            if isinstance(slot, dict):
                candidates.append(slot.get("date"))
    dates: list[date] = []
    for c in candidates:
        if isinstance(c, str) and c:
            try:
                dates.append(datetime.fromisoformat(c.replace("Z", "+00:00")).date())
            except ValueError:
                continue
    return min(dates) if dates else None


def next_schedule(
    schedule: dict[str, Any] | None, recurrence: Recurrence, today: date
) -> dict[str, Any] | None:
    """Move the schedule forward by whole intervals until it starts today or later."""
    step = INTERVAL_DAYS[recurrence]
    first = _first_date(schedule)
    if first is None:
        return shift_schedule(schedule, step)
    intervals = 1
    while first + timedelta(days=step * intervals) < today:
        intervals += 1
    return shift_schedule(schedule, step * intervals)


async def repost_next(db: AsyncSession, tweak: Tweak, _application: Application) -> None:
    """Completion hook (runs inside the completing transaction)."""
    if tweak.recurrence is None:
        return
    nxt = Tweak(
        created_by_user_id=tweak.created_by_user_id,
        title=tweak.title,
        description=tweak.description,
        category=tweak.category,
        tweak_type=tweak.tweak_type,
        status=TweakStatus.active,
        address_id=tweak.address_id,
        skills=list(tweak.skills),
        languages=list(tweak.languages),
        media=list(tweak.media),
        schedule_preference=tweak.schedule_preference,
        schedule_data=next_schedule(
            tweak.schedule_data, tweak.recurrence, datetime.now(UTC).date()
        ),
        pricing_model=tweak.pricing_model,
        pricing_data=copy.deepcopy(tweak.pricing_data),
        price_minor=tweak.price_minor,
        currency=tweak.currency,
        recurrence=tweak.recurrence,
        previous_occurrence_id=tweak.id,
    )
    db.add(nxt)
    await db.flush()
    job_service.enqueue(db, "match_saved_searches", {"tweak_id": str(nxt.id)})
    when = _first_date(nxt.schedule_data)
    notification_service.add(
        db,
        tweak.created_by_user_id,
        NotificationType.system,
        "Your repeating tweak was re-posted",
        f'"{tweak.title}" is live again'
        + (f" for {when.strftime('%d %b')}." if when else ".")
        + " Turn off Repeat on it to stop the series.",
        tweak_id=nxt.id,
    )


application_service.COMPLETION_HOOKS.append(repost_next)
