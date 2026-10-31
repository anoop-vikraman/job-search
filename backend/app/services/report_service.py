"""User reports about users, tweaks and chat messages; resolved by admins."""

import uuid
from datetime import UTC, datetime

from fastapi import status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.chat import Conversation, Message
from app.models.enums import ReportStatus, ReportTarget, TweakStatus
from app.models.moderation import Report
from app.models.tweak import Tweak
from app.models.user import User
from app.schemas.moderation import ReportCreate, ReportResolve


async def _target_owner(
    db: AsyncSession, reporter_id: uuid.UUID, target_type: ReportTarget, target_id: uuid.UUID
) -> uuid.UUID:
    """The user accountable for the target; also checks the reporter may see it."""
    not_found = AppError(status.HTTP_404_NOT_FOUND, "REPORT_TARGET_NOT_FOUND", "Not found.")
    if target_type == ReportTarget.user:
        if await db.get(User, target_id) is None:
            raise not_found
        return target_id
    if target_type == ReportTarget.tweak:
        tweak = await db.get(Tweak, target_id)
        if tweak is None:
            raise not_found
        return tweak.created_by_user_id
    message = await db.get(Message, target_id)
    if message is None:
        raise not_found
    conversation = await db.get(Conversation, message.conversation_id)
    if conversation is None or reporter_id not in (
        conversation.lister_user_id,
        conversation.provider_user_id,
    ):
        raise not_found  # only the conversation's parties can report its messages
    return message.sender_user_id


async def create_report(db: AsyncSession, reporter_id: uuid.UUID, data: ReportCreate) -> Report:
    owner = await _target_owner(db, reporter_id, data.target_type, data.target_id)
    if owner == reporter_id:
        raise AppError(
            status.HTTP_400_BAD_REQUEST, "CANNOT_REPORT_SELF", "You can't report your own content."
        )
    report = Report(
        reporter_user_id=reporter_id,
        target_type=data.target_type,
        target_id=data.target_id,
        target_user_id=owner,
        reason=data.reason,
        details=data.details,
    )
    db.add(report)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise AppError(
            status.HTTP_409_CONFLICT, "ALREADY_REPORTED", "You already reported this."
        ) from exc
    await db.refresh(report)
    return report


async def list_reports(
    db: AsyncSession,
    *,
    status_filter: ReportStatus | None,
    target_type: ReportTarget | None,
    page: int,
    limit: int,
) -> tuple[list[tuple[Report, int]], int]:
    """Reports newest first, each with how many open reports its target user has."""
    conditions = []
    if status_filter is not None:
        conditions.append(Report.status == status_filter)
    if target_type is not None:
        conditions.append(Report.target_type == target_type)
    total = (await db.scalar(select(func.count()).select_from(Report).where(*conditions))) or 0
    rows = list(
        await db.scalars(
            select(Report)
            .where(*conditions)
            .order_by(Report.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
    )
    user_ids = {r.target_user_id for r in rows}
    counts = {
        uid: n
        for uid, n in (
            await db.execute(
                select(Report.target_user_id, func.count())
                .where(Report.target_user_id.in_(user_ids), Report.status == ReportStatus.open)
                .group_by(Report.target_user_id)
            )
        ).tuples()
    }
    return [(r, counts.get(r.target_user_id, 0)) for r in rows], total


async def resolve_report(
    db: AsyncSession, report_id: uuid.UUID, admin_id: uuid.UUID, data: ReportResolve
) -> Report:
    report = await db.scalar(select(Report).where(Report.id == report_id).with_for_update())
    if report is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "REPORT_NOT_FOUND", "Report not found.")
    if report.status != ReportStatus.open:
        raise AppError(status.HTTP_409_CONFLICT, "INVALID_STATE", "Report already resolved.")

    if data.ban_user:
        user = await db.get(User, report.target_user_id)
        if user is not None:
            user.is_banned = True
            user.banned_reason = data.note or f"Reported for {report.reason.value}"
    if data.close_tweak and report.target_type == ReportTarget.tweak:
        tweak = await db.get(Tweak, report.target_id)
        if tweak is not None and tweak.status in (TweakStatus.active, TweakStatus.draft):
            tweak.status = TweakStatus.closed

    actioned = data.ban_user or data.close_tweak or data.action == ReportStatus.actioned
    now = datetime.now(UTC)
    # Resolving one report settles every open report against the same target.
    siblings = await db.scalars(
        select(Report).where(
            Report.target_type == report.target_type,
            Report.target_id == report.target_id,
            Report.status == ReportStatus.open,
        )
    )
    for r in siblings:
        r.status = ReportStatus.actioned if actioned else ReportStatus.dismissed
        r.admin_note = data.note
        r.resolved_by_user_id = admin_id
        r.resolved_at = now
    await db.commit()
    await db.refresh(report)
    return report
