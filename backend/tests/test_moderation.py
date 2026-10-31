import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.security import create_access_token
from app.models.enums import (
    PricingModel,
    ReportReason,
    ReportStatus,
    ReportTarget,
    TweakStatus,
    TweakType,
    UserRole,
)
from app.models.tweak import Tweak
from app.models.user import User
from app.schemas.application import ApplicationCreate
from app.schemas.moderation import ReportCreate, ReportResolve
from app.services import (
    application_service,
    block_service,
    chat_service,
    report_service,
    tweak_service,
)
from app.services.tweak_service import FeedFilters
from tests.conftest import make_user


async def _tweak(db: AsyncSession, owner: User, category: str = "Plumbing") -> Tweak:
    tweak = Tweak(
        created_by_user_id=owner.id,
        title="Fix tap",
        description="d",
        category=category,
        tweak_type=TweakType.in_person,
        status=TweakStatus.active,
        pricing_model=PricingModel.fixed,
        price_minor=5000,
    )
    db.add(tweak)
    await db.flush()
    return tweak


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id), user.role.value)}"}


# ─── Blocking ───────────────────────────────────────────────────────────────


async def test_block_hides_feed_both_ways_and_stops_applying(db: AsyncSession) -> None:
    alice = await make_user(db)
    bob = await make_user(db)
    category = f"zq{uuid.uuid4().hex[:8]}"
    alices = await _tweak(db, alice, category)
    bobs = await _tweak(db, bob, category)

    await block_service.block(db, alice.id, bob.id)
    assert await block_service.blocked_ids(db, bob.id) == {alice.id}

    for viewer, hidden in ((alice, bobs), (bob, alices)):
        rows, _, _ = await tweak_service.list_feed(
            db,
            viewer_id=viewer.id,
            page=1,
            limit=50,
            filters=FeedFilters(category=category),
            exclude_owner_ids=await block_service.blocked_ids(db, viewer.id),
        )
        assert hidden.id not in {r.tweak.id for r in rows}

    with pytest.raises(AppError) as exc:
        await application_service.apply(db, alices.id, bob.id, ApplicationCreate())
    assert exc.value.code == "USER_BLOCKED"

    await block_service.unblock(db, alice.id, bob.id)
    await application_service.apply(db, alices.id, bob.id, ApplicationCreate())


async def test_block_makes_chat_read_only(db: AsyncSession) -> None:
    lister = await make_user(db, balance_minor=10000)
    provider = await make_user(db)
    tweak = await _tweak(db, lister)
    app = await application_service.apply(db, tweak.id, provider.id, ApplicationCreate())
    await application_service.accept(db, app.id, lister.id)
    conv, _ = await chat_service.get_or_create(db, app.id, lister.id)

    await block_service.block(db, provider.id, lister.id)
    view = await chat_service.get_conversation(db, conv.id, lister.id)
    assert view.blocked is True and view.can_send is False
    with pytest.raises(AppError) as exc:
        await chat_service.send_message(db, conv.id, lister.id, "hello?")
    assert exc.value.code == "USER_BLOCKED"


async def test_block_validation(db: AsyncSession) -> None:
    alice = await make_user(db)
    with pytest.raises(AppError) as exc:
        await block_service.block(db, alice.id, alice.id)
    assert exc.value.code == "CANNOT_BLOCK_SELF"
    with pytest.raises(AppError) as exc:
        await block_service.block(db, alice.id, uuid.uuid4())
    assert exc.value.code == "USER_NOT_FOUND"


# ─── Reports ────────────────────────────────────────────────────────────────


async def test_report_rules(db: AsyncSession) -> None:
    owner = await make_user(db)
    reporter = await make_user(db)
    tweak = await _tweak(db, owner)
    # A rejected duplicate rolls back and expires loaded objects; keep plain ids.
    tweak_id, owner_id, reporter_id = tweak.id, owner.id, reporter.id

    report = await report_service.create_report(
        db,
        reporter_id,
        ReportCreate(target_type=ReportTarget.tweak, target_id=tweak_id, reason=ReportReason.scam),
    )
    assert report.target_user_id == owner_id and report.status == ReportStatus.open

    with pytest.raises(AppError) as exc:
        await report_service.create_report(
            db,
            reporter_id,
            ReportCreate(
                target_type=ReportTarget.tweak, target_id=tweak_id, reason=ReportReason.spam
            ),
        )
    assert exc.value.code == "ALREADY_REPORTED"
    with pytest.raises(AppError) as exc:
        await report_service.create_report(
            db,
            owner_id,
            ReportCreate(
                target_type=ReportTarget.tweak, target_id=tweak_id, reason=ReportReason.spam
            ),
        )
    assert exc.value.code == "CANNOT_REPORT_SELF"
    with pytest.raises(AppError) as exc:
        await report_service.create_report(
            db,
            reporter_id,
            ReportCreate(
                target_type=ReportTarget.user, target_id=uuid.uuid4(), reason=ReportReason.spam
            ),
        )
    assert exc.value.code == "REPORT_TARGET_NOT_FOUND"


async def test_only_conversation_parties_report_messages(db: AsyncSession) -> None:
    lister = await make_user(db, balance_minor=10000)
    provider = await make_user(db)
    outsider = await make_user(db)
    tweak = await _tweak(db, lister)
    app = await application_service.apply(db, tweak.id, provider.id, ApplicationCreate())
    await application_service.accept(db, app.id, lister.id)
    conv, _ = await chat_service.get_or_create(db, app.id, lister.id)
    msg = await chat_service.send_message(db, conv.id, provider.id, "Pay me outside the app")

    body = ReportCreate(
        target_type=ReportTarget.message, target_id=msg.id, reason=ReportReason.scam
    )
    with pytest.raises(AppError) as exc:
        await report_service.create_report(db, outsider.id, body)
    assert exc.value.code == "REPORT_TARGET_NOT_FOUND"
    report = await report_service.create_report(db, lister.id, body)
    assert report.target_user_id == provider.id


async def test_resolving_bans_and_closes_and_settles_all_reports(db: AsyncSession) -> None:
    owner = await make_user(db)
    r1 = await make_user(db)
    r2 = await make_user(db)
    admin = await make_user(db, role=UserRole.admin)
    tweak = await _tweak(db, owner)
    body = ReportCreate(
        target_type=ReportTarget.tweak, target_id=tweak.id, reason=ReportReason.scam
    )
    first = await report_service.create_report(db, r1.id, body)
    second = await report_service.create_report(db, r2.id, body)

    rows, _ = await report_service.list_reports(
        db, status_filter=ReportStatus.open, target_type=ReportTarget.tweak, page=1, limit=50
    )
    counts = {r.id: n for r, n in rows}
    assert counts[first.id] == 2

    resolved = await report_service.resolve_report(
        db,
        first.id,
        admin.id,
        ReportResolve(action=ReportStatus.actioned, note="Scam", ban_user=True, close_tweak=True),
    )
    assert resolved.status == ReportStatus.actioned
    await db.refresh(second)
    assert second.status == ReportStatus.actioned
    await db.refresh(owner)
    await db.refresh(tweak)
    assert owner.is_banned and tweak.status == TweakStatus.closed

    with pytest.raises(AppError) as exc:
        await report_service.resolve_report(
            db, first.id, admin.id, ReportResolve(action=ReportStatus.dismissed)
        )
    assert exc.value.code == "INVALID_STATE"


async def test_moderation_http(client: AsyncClient, db: AsyncSession) -> None:
    alice = await make_user(db)
    bob = await make_user(db)
    admin = await make_user(db, role=UserRole.admin)

    blocked = await client.post(f"/api/v1/users/{bob.id}/block", headers=_auth(alice))
    assert blocked.status_code == 200
    again = await client.post(f"/api/v1/users/{bob.id}/block", headers=_auth(alice))
    assert again.status_code == 200
    mine = await client.get("/api/v1/users/me/blocks", headers=_auth(alice))
    assert [b["user"]["id"] for b in mine.json()] == [str(bob.id)]
    assert (
        await client.delete(f"/api/v1/users/{bob.id}/block", headers=_auth(alice))
    ).status_code == 204
    assert (await client.get("/api/v1/users/me/blocks", headers=_auth(alice))).json() == []

    created = await client.post(
        "/api/v1/reports",
        json={
            "target_type": "user",
            "target_id": str(bob.id),
            "reason": "harassment",
            "details": "Rude",
        },
        headers=_auth(alice),
    )
    assert created.status_code == 201
    report_id = created.json()["id"]

    queue = await client.get("/api/v1/admin/reports?status=open", headers=_auth(admin))
    item = next(r for r in queue.json()["items"] if r["id"] == report_id)
    assert item["open_reports_against_user"] == 1

    done = await client.post(
        f"/api/v1/admin/reports/{report_id}/resolve",
        json={"action": "dismissed", "note": "Not enough evidence"},
        headers=_auth(admin),
    )
    assert done.status_code == 200 and done.json()["status"] == "dismissed"
    bad = await client.post(
        f"/api/v1/admin/reports/{report_id}/resolve", json={"action": "open"}, headers=_auth(admin)
    )
    assert bad.status_code in (409, 422)
