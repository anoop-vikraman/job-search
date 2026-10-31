from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.security import create_access_token
from app.models.application import Application
from app.models.enums import (
    ApplicationStatus,
    DisputeOutcome,
    DisputeStatus,
    PricingModel,
    TweakStatus,
    TweakType,
    UserRole,
)
from app.models.job import Job
from app.models.tweak import Tweak
from app.models.user import User
from app.schemas.application import ApplicationCreate, WorkSubmit
from app.schemas.dispute import DisputeCreate, DisputeResolve
from app.services import application_service, dispute_service, wallet_service
from tests.conftest import make_user

PRICE = 100_000  # ₹1,000; 5% fee = 5,000


async def _accepted(db: AsyncSession) -> tuple[User, User, Application, Tweak]:
    lister = await make_user(db, balance_minor=200_000)
    provider = await make_user(db)
    tweak = Tweak(
        created_by_user_id=lister.id,
        title="Paint room",
        description="d",
        category="Painting",
        tweak_type=TweakType.in_person,
        status=TweakStatus.active,
        pricing_model=PricingModel.fixed,
        pricing_data={"amount_minor": PRICE},
        price_minor=PRICE,
    )
    db.add(tweak)
    await db.flush()
    app = await application_service.apply(db, tweak.id, provider.id, ApplicationCreate())
    app = await application_service.accept(db, app.id, lister.id)
    return lister, provider, app, tweak


async def _balances(db: AsyncSession, *users: User) -> list[tuple[int, int]]:
    out = []
    for u in users:
        w = await wallet_service.get_or_create_wallet(db, u.id)
        await db.refresh(w)
        out.append((w.balance_minor, w.held_minor))
    return out


REASON = "The walls were left half painted and messy."


async def test_submit_work_schedules_auto_release_and_blocks_cancel(db: AsyncSession) -> None:
    lister, provider, app, _ = await _accepted(db)
    with pytest.raises(AppError) as exc:
        await application_service.submit_work(db, app.id, lister.id, WorkSubmit())
    assert exc.value.code == "APPLICATION_NOT_FOUND"  # only the provider can submit

    done = await application_service.submit_work(
        db, app.id, provider.id, WorkSubmit(note="Two coats done", photo_urls=["/media/a.jpg"])
    )
    assert done.work_submitted_at is not None and done.auto_release_at is not None
    assert done.completion_photos == [{"url": "/media/a.jpg"}]
    job = await db.scalar(
        select(Job).where(
            Job.kind == "auto_release", Job.payload["application_id"].astext == str(app.id)
        )
    )
    assert job is not None and job.run_at == done.auto_release_at

    with pytest.raises(AppError) as exc:
        await application_service.cancel(db, app.id, lister.id)
    assert exc.value.code == "WORK_SUBMITTED"


async def test_auto_release_pays_provider_only_when_due(db: AsyncSession) -> None:
    lister, provider, app, tweak = await _accepted(db)
    await application_service.submit_work(db, app.id, provider.id, WorkSubmit())
    payload = {"application_id": str(app.id)}

    await application_service.auto_release_job(db, payload)  # not due yet
    await db.refresh(app)
    assert app.status == ApplicationStatus.accepted

    app.auto_release_at = datetime.now(UTC) - timedelta(minutes=1)
    await db.commit()
    await application_service.auto_release_job(db, payload)
    await db.refresh(app)
    await db.refresh(tweak)
    assert app.status == ApplicationStatus.completed
    assert tweak.status == TweakStatus.completed
    assert await _balances(db, lister, provider) == [(100_000, 0), (95_000, 0)]

    await application_service.auto_release_job(db, payload)  # idempotent
    assert await _balances(db, provider) == [(95_000, 0)]


async def test_dispute_freezes_escrow_and_stops_auto_release(db: AsyncSession) -> None:
    lister, provider, app, _ = await _accepted(db)
    stranger = await make_user(db)
    await application_service.submit_work(db, app.id, provider.id, WorkSubmit())

    with pytest.raises(AppError) as exc:
        await dispute_service.open_dispute(db, app.id, stranger.id, DisputeCreate(reason=REASON))
    assert exc.value.code == "NOT_A_PARTY"

    dispute = await dispute_service.open_dispute(
        db, app.id, lister.id, DisputeCreate(reason=REASON, evidence_urls=["/media/b.jpg"])
    )
    await db.refresh(app)
    assert app.status == ApplicationStatus.disputed and app.auto_release_at is None
    assert dispute.evidence == [{"url": "/media/b.jpg"}]

    with pytest.raises(AppError) as exc:
        await dispute_service.open_dispute(db, app.id, provider.id, DisputeCreate(reason=REASON))
    assert exc.value.code == "INVALID_STATE"
    with pytest.raises(AppError) as exc:
        await application_service.complete(db, app.id, lister.id)
    assert exc.value.code == "INVALID_STATE"

    await application_service.auto_release_job(db, {"application_id": str(app.id)})
    await db.refresh(app)
    assert app.status == ApplicationStatus.disputed
    assert await _balances(db, lister) == [(100_000, PRICE)]


@pytest.mark.parametrize(
    ("outcome", "provider_amount", "lister_after", "provider_after", "app_status"),
    [
        (DisputeOutcome.release, None, (100_000, 0), (95_000, 0), ApplicationStatus.completed),
        (DisputeOutcome.refund, None, (200_000, 0), (0, 0), ApplicationStatus.withdrawn),
        # Provider gets 40,000 gross (fee 2,000); lister gets 60,000 back.
        (DisputeOutcome.partial, 40_000, (160_000, 0), (38_000, 0), ApplicationStatus.completed),
    ],
)
async def test_resolution_moves_money(
    db: AsyncSession,
    outcome: DisputeOutcome,
    provider_amount: int | None,
    lister_after: tuple[int, int],
    provider_after: tuple[int, int],
    app_status: ApplicationStatus,
) -> None:
    lister, provider, app, _ = await _accepted(db)
    admin = await make_user(db, role=UserRole.admin)
    dispute = await dispute_service.open_dispute(
        db, app.id, provider.id, DisputeCreate(reason=REASON)
    )

    resolved = await dispute_service.resolve_dispute(
        db,
        dispute.id,
        admin.id,
        DisputeResolve(outcome=outcome, provider_amount_minor=provider_amount, note="Reviewed"),
    )
    assert resolved.status == DisputeStatus.resolved and resolved.outcome == outcome
    await db.refresh(app)
    assert app.status == app_status
    assert await _balances(db, lister, provider) == [lister_after, provider_after]

    with pytest.raises(AppError) as exc:
        await dispute_service.resolve_dispute(
            db, dispute.id, admin.id, DisputeResolve(outcome=DisputeOutcome.release)
        )
    assert exc.value.code == "INVALID_STATE"


async def test_partial_needs_amount_strictly_inside_escrow(db: AsyncSession) -> None:
    _, provider, app, _ = await _accepted(db)
    admin = await make_user(db, role=UserRole.admin)
    dispute = await dispute_service.open_dispute(
        db, app.id, provider.id, DisputeCreate(reason=REASON)
    )
    for amount in (None, 0, PRICE):
        with pytest.raises(AppError) as exc:
            await dispute_service.resolve_dispute(
                db,
                dispute.id,
                admin.id,
                DisputeResolve(outcome=DisputeOutcome.partial, provider_amount_minor=amount),
            )
        assert exc.value.code == "INVALID_SPLIT"


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id), user.role.value)}"}


async def test_dispute_http_flow(client: AsyncClient, db: AsyncSession) -> None:
    lister, provider, app, _ = await _accepted(db)
    admin = await make_user(db, role=UserRole.admin)

    submitted = await client.post(
        f"/api/v1/tweaks/applications/{app.id}/submit-work",
        json={"note": "All done", "photo_urls": []},
        headers=_auth(provider),
    )
    assert submitted.status_code == 200
    assert submitted.json()["auto_release_at"].endswith("Z")

    short = await client.post(
        f"/api/v1/tweaks/applications/{app.id}/dispute",
        json={"reason": "bad"},
        headers=_auth(lister),
    )
    assert short.status_code == 422
    opened = await client.post(
        f"/api/v1/tweaks/applications/{app.id}/dispute",
        json={"reason": REASON},
        headers=_auth(lister),
    )
    assert opened.status_code == 201
    dispute_id = opened.json()["id"]

    seen = await client.get(
        f"/api/v1/tweaks/applications/{app.id}/dispute", headers=_auth(provider)
    )
    assert seen.status_code == 200 and seen.json()["status"] == "open"

    queue = await client.get("/api/v1/admin/disputes?status=open", headers=_auth(admin))
    assert dispute_id in [d["id"] for d in queue.json()["items"]]
    assert (await client.get("/api/v1/admin/disputes", headers=_auth(lister))).status_code == 403

    resolved = await client.post(
        f"/api/v1/admin/disputes/{dispute_id}/resolve",
        json={"outcome": "refund", "note": "Work not delivered"},
        headers=_auth(admin),
    )
    assert resolved.status_code == 200
    assert resolved.json()["outcome"] == "refund"
