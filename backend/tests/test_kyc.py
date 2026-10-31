from pathlib import Path

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token
from app.models.enums import KycStatus, UserRole
from app.models.user import User
from app.services import payment_service
from tests.conftest import make_user

JPEG = b"\xff\xd8\xff\xe0" + b"0" * 100


@pytest.fixture(autouse=True)
def _private_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr(settings, "KYC_DIR", str(tmp_path / "kyc"))
    return tmp_path / "kyc"


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id), user.role.value)}"}


def _form(**over: str) -> dict[str, str]:
    data = {
        "full_name": "Priya Sharma",
        "id_type": "pan",
        "id_number": "ABCDE 1234F",
        "upi_id": "priya@okicici",
    }
    data.update(over)
    return data


async def _submit(
    client: AsyncClient, user: User, files: int = 2, **over: str
) -> dict[str, object]:
    res = await client.post(
        "/api/v1/kyc",
        data=_form(**over),
        files=[("documents", (f"id{i}.jpg", JPEG, "image/jpeg")) for i in range(files)],
        headers=_auth(user),
    )
    return {"status": res.status_code, "body": res.json()}


async def test_kyc_submit_review_and_payout(
    client: AsyncClient, db: AsyncSession, _private_dir: Path
) -> None:
    user = await make_user(db, balance_minor=50000)
    admin = await make_user(db, role=UserRole.admin)

    status = await client.get("/api/v1/kyc", headers=_auth(user))
    assert status.json() == {"verified": False, "verified_at": None, "latest": None}

    first = await _submit(client, user)
    assert first["status"] == 201
    body = first["body"]
    assert isinstance(body, dict)
    assert body["status"] == "pending" and body["id_number_last4"] == "234F"
    assert "id_number" not in body
    # Stored privately, outside the public media dir.
    stored = list(_private_dir.iterdir())
    assert len(stored) == 2 and not str(_private_dir).startswith(settings.MEDIA_DIR)

    dup = await _submit(client, user)
    assert dup["status"] == 409 and dup["body"]["code"] == "KYC_PENDING"  # type: ignore[index]

    queue = await client.get("/api/v1/admin/kyc?status=pending", headers=_auth(admin))
    item = next(k for k in queue.json()["items"] if k["id"] == body["id"])
    assert item["document_count"] == 2 and item["user_name"] == "Test"

    doc = await client.get(f"/api/v1/admin/kyc/{body['id']}/documents/0", headers=_auth(admin))
    assert doc.status_code == 200 and doc.content == JPEG
    assert (
        await client.get(f"/api/v1/admin/kyc/{body['id']}/documents/0", headers=_auth(user))
    ).status_code == 403
    assert (
        await client.get(f"/api/v1/admin/kyc/{body['id']}/documents/9", headers=_auth(admin))
    ).status_code == 404

    no_reason = await client.post(
        f"/api/v1/admin/kyc/{body['id']}/review", json={"approve": False}, headers=_auth(admin)
    )
    assert no_reason.status_code == 400
    approved = await client.post(
        f"/api/v1/admin/kyc/{body['id']}/review", json={"approve": True}, headers=_auth(admin)
    )
    assert approved.status_code == 200 and approved.json()["status"] == KycStatus.approved

    status = await client.get("/api/v1/kyc", headers=_auth(user))
    assert status.json()["verified"] is True
    await db.refresh(user)
    payout = await payment_service.request_payout(db, user, 20000)
    assert payout.upi_id == "priya@okicici"

    again = await _submit(client, user)
    assert again["status"] == 409 and again["body"]["code"] == "ALREADY_VERIFIED"  # type: ignore[index]


async def test_rejected_user_can_resubmit(client: AsyncClient, db: AsyncSession) -> None:
    user = await make_user(db)
    admin = await make_user(db, role=UserRole.admin)
    first = await _submit(client, user)
    sub_id = first["body"]["id"]  # type: ignore[index]
    await client.post(
        f"/api/v1/admin/kyc/{sub_id}/review",
        json={"approve": False, "reason": "Photo is blurry"},
        headers=_auth(admin),
    )
    status = await client.get("/api/v1/kyc", headers=_auth(user))
    latest = status.json()["latest"]
    assert latest["status"] == "rejected" and latest["rejection_reason"] == "Photo is blurry"
    assert (await _submit(client, user))["status"] == 201


@pytest.mark.parametrize(
    ("over", "files", "code"),
    [
        ({"upi_id": "not-a-upi"}, 1, "INVALID_UPI"),
        ({"id_number": "12"}, 1, "INVALID_ID_NUMBER"),
        ({}, 0, "VALIDATION_ERROR"),  # documents field is required
        ({}, 4, "KYC_DOCUMENTS_REQUIRED"),
    ],
)
async def test_kyc_validation(
    client: AsyncClient, db: AsyncSession, over: dict[str, str], files: int, code: str
) -> None:
    user = await make_user(db)
    res = await _submit(client, user, files=files, **over)
    assert res["body"]["code"] == code  # type: ignore[index]
