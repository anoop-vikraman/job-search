import uuid
from typing import Literal

from pydantic import BaseModel, Field

from app.models.enums import ReportReason, ReportStatus, ReportTarget
from app.schemas.chat import ChatParticipant
from app.schemas.common import ORMModel, UtcDatetime


class ReportCreate(BaseModel):
    target_type: ReportTarget
    target_id: uuid.UUID
    reason: ReportReason
    details: str | None = Field(None, max_length=2000)


class ReportResponse(ORMModel):
    id: uuid.UUID
    reporter_user_id: uuid.UUID
    target_type: ReportTarget
    target_id: uuid.UUID
    target_user_id: uuid.UUID
    reason: ReportReason
    details: str | None
    status: ReportStatus
    admin_note: str | None
    resolved_at: UtcDatetime | None
    created_at: UtcDatetime


class AdminReportResponse(ReportResponse):
    # Open reports against the same user, to spot repeat offenders.
    open_reports_against_user: int


class ReportResolve(BaseModel):
    action: Literal[ReportStatus.actioned, ReportStatus.dismissed]
    note: str | None = Field(None, max_length=1000)
    ban_user: bool = False
    close_tweak: bool = False


class BlockedUser(BaseModel):
    user: ChatParticipant
    blocked_at: UtcDatetime
