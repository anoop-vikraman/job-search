"""Seed the database with realistic demo data.

Idempotent: re-running clears and re-creates the seed users (by phone number) and
everything owned by them, then rebuilds the full marketplace scenario — tweaks,
applications, offers, an accepted job with an escrow hold, wallet top-ups,
a processed refund, and ratings.

Run:  cd backend && venv/bin/python -m app.seeds.seed
"""

import asyncio
from datetime import UTC, datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.db.session import async_session_maker
from app.models.application import Application, Offer
from app.models.enums import (
    ApplicationStatus,
    PricingModel,
    RefundStatus,
    TweakStatus,
    TweakType,
    UserRole,
)
from app.models.rating import Rating
from app.models.refund import Refund
from app.models.tweak import Tweak
from app.models.user import User
from app.models.wallet import Wallet
from app.services import wallet_service

PASSWORD = "Password@123"
ADMIN_PASSWORD = "Admin@12345"


# (phone, first, last, role, skills, completed_categories)
USERS = [
    ("9000000000", "Ava", "Admin", UserRole.admin, [], []),
    ("9000000001", "Liam", "Lister", UserRole.user, [], []),
    ("9000000002", "Priya", "Plumber", UserRole.user, ["Plumbing", "Electrical"], ["Plumbing"]),
    ("9000000003", "Marco", "Mover", UserRole.user, ["Moving", "Cleaning"], ["Moving", "Cleaning"]),
    ("9000000004", "Dina", "Designer", UserRole.user, ["Design", "Writing"], ["Design"]),
    ("9000000005", "Sam", "Seeker", UserRole.user, ["Coding"], []),
]

SEED_PHONES = [u[0] for u in USERS]


async def _clear(db: AsyncSession) -> None:
    """Remove prior seed data (users + everything cascading from them)."""
    users = (await db.scalars(select(User).where(User.phone_number.in_(SEED_PHONES)))).all()
    ids = [u.id for u in users]
    if not ids:
        return
    # Ratings / refunds reference users or applications with NO ACTION, so clear them first.
    app_ids = (
        await db.scalars(select(Application.id).where(Application.provider_user_id.in_(ids)))
    ).all()
    tweak_ids = (
        await db.scalars(select(Tweak.id).where(Tweak.created_by_user_id.in_(ids)))
    ).all()
    await db.execute(delete(Rating).where(Rating.rater_user_id.in_(ids)))
    if app_ids:
        await db.execute(delete(Refund).where(Refund.application_id.in_(app_ids)))
    await db.execute(delete(Refund).where(Refund.requested_by_user_id.in_(ids)))
    # Tweaks cascade to applications/offers; users cascade to wallets/transactions/addresses.
    if tweak_ids:
        await db.execute(delete(Tweak).where(Tweak.id.in_(tweak_ids)))
    await db.execute(delete(User).where(User.id.in_(ids)))
    await db.commit()


async def _create_users(db: AsyncSession) -> dict[str, User]:
    by_name: dict[str, User] = {}
    for phone, first, last, role, skills, completed in USERS:
        pwd = ADMIN_PASSWORD if role == UserRole.admin else PASSWORD
        user = User(
            phone_number=phone,
            country_code="+91",
            hashed_password=hash_password(pwd),
            first_name=first,
            last_name=last,
            email=f"{first.lower()}@tweak.test",
            role=role,
            is_phone_verified=True,
            skills=skills,
            completed_categories=completed,
        )
        db.add(user)
        await db.flush()
        db.add(Wallet(user_id=user.id))
        by_name[first] = user
    await db.commit()
    return by_name


def _tweak(owner: User, **kw: object) -> Tweak:
    defaults = dict(
        created_by_user_id=owner.id,
        tweak_type=TweakType.in_person,
        status=TweakStatus.active,
        skills=[],
        languages=["English"],
        media=[],
        currency="INR",
    )
    defaults.update(kw)
    return Tweak(**defaults)


async def _create_tweaks(db: AsyncSession, u: dict[str, User]) -> list[Tweak]:
    tweaks = [
        _tweak(
            u["Liam"],
            title="Fix a leaking kitchen sink",
            description="The under-sink pipe drips; needs a new seal and a check of the trap.",
            category="Plumbing",
            pricing_model=PricingModel.fixed,
            pricing_data={"amount_minor": 120000},
            price_minor=120000,
            schedule_preference="one_day",
            schedule_data={"date": "2026-11-05", "timeSlots": [{"start": "10:00", "end": "12:00"}]},
        ),
        _tweak(
            u["Liam"],
            title="Help move a 2-BHK apartment",
            description="Pack and move boxes and furniture across town. Need two hours of help.",
            category="Moving",
            pricing_model=PricingModel.hourly,
            pricing_data={"rate_per_hour_minor": 40000, "estimated_hours": 3},
            price_minor=120000,
            schedule_preference="few_days",
        ),
        _tweak(
            u["Dina"],
            title="Design a logo for a coffee cart",
            description="Simple, friendly logo + one color variant. Remote is fine.",
            category="Design",
            tweak_type=TweakType.remote,
            pricing_model=PricingModel.quote,
            pricing_data=None,
            price_minor=None,
        ),
        _tweak(
            u["Liam"],
            title="Deep-clean a studio (draft)",
            description="Full clean before a move-out inspection.",
            category="Cleaning",
            status=TweakStatus.draft,
            pricing_model=PricingModel.fixed,
            pricing_data={"amount_minor": 80000},
            price_minor=80000,
        ),
        _tweak(
            u["Sam"],
            title="Build a small landing page",
            description="One-page responsive site from a Figma mock.",
            category="Coding",
            tweak_type=TweakType.remote,
            pricing_model=PricingModel.quantity,
            pricing_data={"unit_label": "page", "unit_price_minor": 50000, "quantity": 1},
            price_minor=50000,
        ),
    ]
    for t in tweaks:
        db.add(t)
    await db.commit()
    return tweaks


async def _application(
    db: AsyncSession, tweak: Tweak, provider: User, *, quote: int | None, msg: str,
    status: ApplicationStatus = ApplicationStatus.pending,
) -> Application:
    app = Application(
        tweak_id=tweak.id,
        provider_user_id=provider.id,
        why_prefer_message=msg,
        quoted_price_minor=quote,
        selected_slots=[],
        status=status,
        responded_at=datetime.now(UTC) if status != ApplicationStatus.pending else None,
    )
    db.add(app)
    await db.flush()
    return app


async def run() -> None:
    async with async_session_maker() as db:
        await _clear(db)
        u = await _create_users(db)
        tweaks = await _create_tweaks(db, u)
        sink, move, logo, _draft, landing = tweaks

        # Everyone tops up some wallet balance.
        await wallet_service.topup(db, u["Liam"].id, 500000, "seed-topup-liam")
        await wallet_service.topup(db, u["Sam"].id, 300000, "seed-topup-sam")

        # Pending applications on the sink job (two providers compete).
        app_sink_priya = await _application(
            db, sink, u["Priya"], quote=120000, msg="Licensed plumber, can come at 10am."
        )
        await _application(
            db, sink, u["Marco"], quote=110000, msg="I can do basic plumbing cheaper."
        )
        await db.commit()

        # Lister counter-quotes Marco on the move job, Marco applied.
        app_move_marco = await _application(
            db, move, u["Marco"], quote=130000, msg="Two movers, 3 hours."
        )
        await db.flush()
        db.add(
            Offer(
                application_id=app_move_marco.id,
                lister_quoted_price_minor=120000,
                message="Budget is 1200. Can you match?",
            )
        )
        await db.commit()

        # Accept Priya on the sink job -> escrow hold on Liam's wallet.
        await wallet_service.place_hold(
            db, u["Liam"].id, 120000, tweak_id=sink.id, application_id=app_sink_priya.id
        )
        app_sink_priya.status = ApplicationStatus.accepted
        app_sink_priya.responded_at = datetime.now(UTC)
        sink.status = TweakStatus.closed
        await db.commit()

        # A provider applies to the landing page job and gets accepted + completed + refunded.
        app_landing = await _application(
            db, landing, u["Dina"], quote=50000, msg="I can build it this week."
        )
        await wallet_service.place_hold(
            db, u["Sam"].id, 50000, tweak_id=landing.id, application_id=app_landing.id
        )
        app_landing.status = ApplicationStatus.accepted
        app_landing.responded_at = datetime.now(UTC)
        landing.status = TweakStatus.closed
        await db.commit()

        # Sam cancels and gets a processed refund (reverses the hold).
        refund_txn = await wallet_service.refund_hold(
            db, u["Sam"].id, 50000, application_id=app_landing.id
        )
        await db.flush()
        db.add(
            Refund(
                application_id=app_landing.id,
                requested_by_user_id=u["Sam"].id,
                amount_minor=50000,
                reason="Changed my mind about the design direction.",
                status=RefundStatus.processed,
                reversing_txn_id=refund_txn.id,
                processed_at=datetime.now(UTC),
            )
        )
        app_landing.status = ApplicationStatus.withdrawn
        await db.commit()

        # Ratings on the completed sink job (both directions).
        db.add_all(
            [
                Rating(
                    tweak_id=sink.id,
                    rater_user_id=u["Liam"].id,
                    ratee_user_id=u["Priya"].id,
                    score=5,
                    comment="On time and fixed it fast.",
                ),
                Rating(
                    tweak_id=sink.id,
                    rater_user_id=u["Priya"].id,
                    ratee_user_id=u["Liam"].id,
                    score=4,
                    comment="Clear instructions, easy access.",
                ),
            ]
        )
        # Reflect the ratings in the aggregate.
        u["Priya"].rating_avg = 5
        u["Priya"].rating_count = 1
        u["Liam"].rating_avg = 4
        u["Liam"].rating_count = 1
        await db.commit()

        print("Seed complete.")
        print(f"  Admin login:  +91 9000000000 / {ADMIN_PASSWORD}")
        print(f"  Demo users:   +91 9000000001..9000000005 / {PASSWORD}")
        print(f"  Tweaks: {len(tweaks)}  (1 draft, 1 closed-sink, 1 closed-landing)")
        print("  Liam wallet: 500000 topup, 120000 held (sink accepted)")


if __name__ == "__main__":
    asyncio.run(run())
