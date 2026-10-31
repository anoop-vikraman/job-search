"""Funnel analytics: posted → applied → accepted → completed.

Business events are recorded server-side in the same transaction as the action (so counts
match reality). The app may add a few whitelisted client events (screen views, searches).
"""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import Date, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import AnalyticsEvent

# Server-side funnel steps, in order.
FUNNEL = ("tweak_posted", "application_submitted", "application_accepted", "job_completed")
SERVER_EVENTS = {*FUNNEL, "topup_paid", "payout_requested", "dispute_opened"}
# What the app may send (POST /analytics/events).
CLIENT_EVENTS = {"app_open", "tweak_viewed", "search_performed", "checkout_opened"}
MAX_PROPERTIES = 10


def track(
    db: AsyncSession,
    name: str,
    *,
    user_id: uuid.UUID | None = None,
    tweak_id: uuid.UUID | None = None,
    properties: dict[str, Any] | None = None,
) -> None:
    """Record an event in the caller's transaction (no commit)."""
    db.add(
        AnalyticsEvent(
            name=name, user_id=user_id, tweak_id=tweak_id, properties=dict(properties or {})
        )
    )


def clean_properties(raw: dict[str, Any]) -> dict[str, str | int | float | bool]:
    """Keep up to 10 scalar properties with short keys/values (client input)."""
    out: dict[str, str | int | float | bool] = {}
    for key, value in list(raw.items())[:MAX_PROPERTIES]:
        if not isinstance(key, str) or len(key) > 40:
            continue
        if isinstance(value, bool | int | float):
            out[key] = value
        elif isinstance(value, str):
            out[key] = value[:200]
    return out


async def funnel(db: AsyncSession, days: int) -> dict[str, Any]:
    """Event counts and unique users per step over the last `days`, plus a daily series."""
    since = datetime.now(UTC) - timedelta(days=days)
    names = (*FUNNEL, *sorted(CLIENT_EVENTS), "topup_paid", "payout_requested", "dispute_opened")
    totals = {
        name: (count, users)
        for name, count, users in (
            await db.execute(
                select(
                    AnalyticsEvent.name,
                    func.count(),
                    func.count(func.distinct(AnalyticsEvent.user_id)),
                )
                .where(AnalyticsEvent.created_at >= since, AnalyticsEvent.name.in_(names))
                .group_by(AnalyticsEvent.name)
            )
        ).tuples()
    }
    day = cast(func.timezone("UTC", AnalyticsEvent.created_at), Date)
    series: dict[str, dict[str, int]] = {}
    for name, d, count in (
        await db.execute(
            select(AnalyticsEvent.name, day, func.count())
            .where(AnalyticsEvent.created_at >= since, AnalyticsEvent.name.in_(FUNNEL))
            .group_by(AnalyticsEvent.name, day)
            .order_by(day)
        )
    ).tuples():
        series.setdefault(d.isoformat(), {})[name] = count

    steps = []
    previous: int | None = None
    for name in FUNNEL:
        count = totals.get(name, (0, 0))[0]
        steps.append(
            {
                "name": name,
                "count": count,
                "unique_users": totals.get(name, (0, 0))[1],
                # Conversion from the previous step (None for the first step or a zero base).
                "conversion": round(count / previous, 4) if previous else None,
            }
        )
        previous = count
    other = {
        name: {"count": c, "unique_users": u}
        for name, (c, u) in totals.items()
        if name not in FUNNEL
    }
    return {
        "days": days,
        "steps": steps,
        "other_events": other,
        "daily": [{"date": d, **counts} for d, counts in sorted(series.items())],
    }
