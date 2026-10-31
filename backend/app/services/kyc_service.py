"""Identity verification (KYC) with manual admin review.

Documents are written to the private KYC_DIR (not served as static files) under random
names; admins fetch them through an authenticated endpoint. Only the last four characters
of the ID number are kept. An approved submission marks the user verified and fixes the
UPI id that withdrawals are paid to.
"""

import re
import secrets
import uuid
from datetime import UTC, datetime
from pathlib import Path

from fastapi import UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.models.enums import KycIdType, KycStatus, NotificationType
from app.models.kyc import KycSubmission
from app.models.user import User
from app.services import notification_service

DOC_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}
MAX_DOC_BYTES = 8 * 1024 * 1024
MAX_DOCS = 3
ID_NUMBER_RE = re.compile(r"^[A-Za-z0-9]{6,20}$")
UPI_RE = re.compile(r"^[A-Za-z0-9.\-_]{2,256}@[A-Za-z][A-Za-z0-9]{1,63}$")


def _doc_dir() -> Path:
    path = Path(settings.KYC_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


async def _store(files: list[UploadFile]) -> list[str]:
    if not 1 <= len(files) <= MAX_DOCS:
        raise AppError(
            status.HTTP_400_BAD_REQUEST,
            "KYC_DOCUMENTS_REQUIRED",
            f"Upload 1 to {MAX_DOCS} document images (front/back of your ID).",
        )
    keys: list[str] = []
    for f in files:
        ext = DOC_TYPES.get(f.content_type or "")
        if ext is None:
            raise AppError(
                status.HTTP_400_BAD_REQUEST, "UNSUPPORTED_MEDIA_TYPE", "Use JPG, PNG, WebP or PDF."
            )
        data = await f.read()
        if len(data) > MAX_DOC_BYTES:
            raise AppError(
                status.HTTP_400_BAD_REQUEST, "FILE_TOO_LARGE", "Each file must be ≤ 8 MB."
            )
        key = f"{secrets.token_urlsafe(24)}{ext}"
        (_doc_dir() / key).write_bytes(data)
        keys.append(key)
    return keys


async def submit(
    db: AsyncSession,
    user: User,
    *,
    full_name: str,
    id_type: KycIdType,
    id_number: str,
    upi_id: str,
    documents: list[UploadFile],
) -> KycSubmission:
    if user.kyc_verified_at is not None:
        raise AppError(status.HTTP_409_CONFLICT, "ALREADY_VERIFIED", "You're already verified.")
    full_name = full_name.strip()
    id_number = re.sub(r"[\s-]", "", id_number)
    if not 2 <= len(full_name) <= 160:
        raise AppError(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "INVALID_NAME", "Enter your full name."
        )
    if not ID_NUMBER_RE.match(id_number):
        raise AppError(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "INVALID_ID_NUMBER", "Enter a valid ID number."
        )
    if not UPI_RE.match(upi_id):
        raise AppError(status.HTTP_422_UNPROCESSABLE_ENTITY, "INVALID_UPI", "Enter a valid UPI id.")
    pending = await db.scalar(
        select(KycSubmission.id).where(
            KycSubmission.user_id == user.id, KycSubmission.status == KycStatus.pending
        )
    )
    if pending is not None:
        raise AppError(status.HTTP_409_CONFLICT, "KYC_PENDING", "Your verification is in review.")

    keys = await _store(documents)
    submission = KycSubmission(
        user_id=user.id,
        full_name=full_name,
        id_type=id_type,
        id_number_last4=id_number[-4:].upper(),
        document_keys=keys,
        upi_id=upi_id,
    )
    db.add(submission)
    try:
        await db.commit()
    except IntegrityError as exc:  # concurrent pending submission
        await db.rollback()
        for key in keys:
            (_doc_dir() / key).unlink(missing_ok=True)
        raise AppError(
            status.HTTP_409_CONFLICT, "KYC_PENDING", "Your verification is in review."
        ) from exc
    await db.refresh(submission)
    return submission


async def latest(db: AsyncSession, user_id: uuid.UUID) -> KycSubmission | None:
    submission: KycSubmission | None = await db.scalar(
        select(KycSubmission)
        .where(KycSubmission.user_id == user_id)
        .order_by(KycSubmission.created_at.desc())
        .limit(1)
    )
    return submission


async def verified_upi(db: AsyncSession, user: User) -> str | None:
    """UPI id from the approved submission, if the user is verified."""
    if user.kyc_verified_at is None:
        return None
    upi: str | None = await db.scalar(
        select(KycSubmission.upi_id)
        .where(KycSubmission.user_id == user.id, KycSubmission.status == KycStatus.approved)
        .order_by(KycSubmission.reviewed_at.desc())
        .limit(1)
    )
    return upi


async def list_submissions(
    db: AsyncSession, *, status_filter: KycStatus | None, page: int, limit: int
) -> tuple[list[tuple[KycSubmission, User]], int]:
    conditions = [KycSubmission.status == status_filter] if status_filter else []
    total = (
        await db.scalar(select(func.count()).select_from(KycSubmission).where(*conditions))
    ) or 0
    rows = await db.execute(
        select(KycSubmission, User)
        .join(User, User.id == KycSubmission.user_id)
        .where(*conditions)
        .order_by(KycSubmission.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    return [(k, u) for k, u in rows.tuples()], total


async def document_path(db: AsyncSession, submission_id: uuid.UUID, index: int) -> Path:
    submission = await db.get(KycSubmission, submission_id)
    if submission is None or not 0 <= index < len(submission.document_keys):
        raise AppError(status.HTTP_404_NOT_FOUND, "DOCUMENT_NOT_FOUND", "Document not found.")
    path = _doc_dir() / submission.document_keys[index]
    if not path.is_file():
        raise AppError(status.HTTP_404_NOT_FOUND, "DOCUMENT_NOT_FOUND", "Document not found.")
    return path


async def review(
    db: AsyncSession,
    submission_id: uuid.UUID,
    admin_id: uuid.UUID,
    *,
    approve: bool,
    reason: str | None,
) -> KycSubmission:
    submission = await db.scalar(
        select(KycSubmission).where(KycSubmission.id == submission_id).with_for_update()
    )
    if submission is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "KYC_NOT_FOUND", "Submission not found.")
    if submission.status != KycStatus.pending:
        raise AppError(status.HTTP_409_CONFLICT, "INVALID_STATE", "Already reviewed.")
    if not approve and not reason:
        raise AppError(
            status.HTTP_400_BAD_REQUEST, "REASON_REQUIRED", "Give the user a reason to fix."
        )
    user = await db.get(User, submission.user_id)
    if user is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "USER_NOT_FOUND", "User not found.")

    now = datetime.now(UTC)
    submission.status = KycStatus.approved if approve else KycStatus.rejected
    submission.rejection_reason = None if approve else reason
    submission.reviewed_by_user_id = admin_id
    submission.reviewed_at = now
    if approve:
        user.kyc_verified_at = now
    notification_service.add(
        db,
        user.id,
        NotificationType.system,
        "Identity verified" if approve else "Verification needs another look",
        "You can now withdraw your earnings."
        if approve
        else f"Please resubmit your documents. Reason: {reason}",
    )
    await db.commit()
    await db.refresh(submission)
    return submission
