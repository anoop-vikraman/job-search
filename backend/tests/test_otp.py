import json
from urllib.parse import parse_qs

import httpx
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.services import otp_service, sms_service

CC, PHONE = "+91", "9876500001"


async def test_codes_are_single_use(db: AsyncSession) -> None:
    code = await otp_service.generate(db, CC, PHONE, "SIGNUP")
    assert len(code) == 6 and code.isdigit()
    assert await otp_service.verify(db, CC, PHONE, "SIGNUP", code) is True
    assert await otp_service.verify(db, CC, PHONE, "SIGNUP", code) is False


async def test_new_code_invalidates_old_and_purpose_is_scoped(db: AsyncSession) -> None:
    old = await otp_service.generate(db, CC, PHONE, "SIGNUP")
    new = await otp_service.generate(db, CC, PHONE, "SIGNUP")
    if old != new:
        assert await otp_service.verify(db, CC, PHONE, "SIGNUP", old) is False
    assert await otp_service.verify(db, CC, PHONE, "FORGOT_PASSWORD", new) is False
    assert await otp_service.verify(db, CC, PHONE, "SIGNUP", new) is True


async def test_locks_after_five_wrong_attempts(db: AsyncSession) -> None:
    code = await otp_service.generate(db, CC, PHONE, "SIGNUP")
    wrong = "000000" if code != "000000" else "111111"
    for _ in range(otp_service.MAX_ATTEMPTS):
        assert await otp_service.verify(db, CC, PHONE, "SIGNUP", wrong) is False
    assert await otp_service.verify(db, CC, PHONE, "SIGNUP", code) is False


async def test_msg91_and_twilio_requests(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        if "msg91" in request.url.host:
            return httpx.Response(200, json={"type": "success"})
        return httpx.Response(201, json={"sid": "SM1"})

    monkeypatch.setattr(sms_service, "transport", httpx.MockTransport(handler))

    monkeypatch.setattr(settings, "SMS_PROVIDER", "msg91")
    monkeypatch.setattr(settings, "MSG91_AUTH_KEY", "key")
    monkeypatch.setattr(settings, "MSG91_TEMPLATE_ID", "tmpl")
    await sms_service.send_otp(CC, PHONE, "123456")
    assert seen[0].url.params["mobile"] == "919876500001"
    assert seen[0].url.params["otp"] == "123456"
    assert seen[0].headers["authkey"] == "key"
    assert sms_service.exposes_dev_code() is False

    monkeypatch.setattr(settings, "SMS_PROVIDER", "twilio")
    monkeypatch.setattr(settings, "TWILIO_ACCOUNT_SID", "AC1")
    monkeypatch.setattr(settings, "TWILIO_AUTH_TOKEN", "tok")
    monkeypatch.setattr(settings, "TWILIO_FROM", "MG123")
    await sms_service.send_otp(CC, PHONE, "654321")
    form = parse_qs(seen[1].content.decode())
    assert form["To"] == ["+919876500001"]
    assert form["MessagingServiceSid"] == ["MG123"]
    assert "654321" in form["Body"][0]


async def test_provider_failure_and_missing_config(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        sms_service, "transport", httpx.MockTransport(lambda _: httpx.Response(401, text="bad key"))
    )
    monkeypatch.setattr(settings, "SMS_PROVIDER", "msg91")
    monkeypatch.setattr(settings, "MSG91_AUTH_KEY", "key")
    monkeypatch.setattr(settings, "MSG91_TEMPLATE_ID", "tmpl")
    with pytest.raises(AppError) as exc:
        await sms_service.send_otp(CC, PHONE, "123456")
    assert exc.value.code == "SMS_SEND_FAILED"

    monkeypatch.setattr(settings, "SMS_PROVIDER", "twilio")
    monkeypatch.setattr(settings, "TWILIO_ACCOUNT_SID", None)
    with pytest.raises(AppError) as exc:
        await sms_service.send_otp(CC, PHONE, "123456")
    assert exc.value.code == "SMS_SEND_FAILED"


async def test_otp_http_flow(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    body = {"country_code": CC, "phone_number": "9876500002", "request_type": "SIGNUP"}
    res = await client.post("/api/v1/auth/otp/generate", json=body)
    assert res.status_code == 200
    message = res.json()["message"]
    code = message.split("dev code: ")[1].rstrip(")")
    ok = await client.post("/api/v1/auth/otp/verify", json={**body, "otp": code})
    assert ok.status_code == 200
    reused = await client.post("/api/v1/auth/otp/verify", json={**body, "otp": code})
    assert reused.status_code == 400 and reused.json()["code"] == "INVALID_OTP"

    # Real providers never echo the code.
    monkeypatch.setattr(settings, "SMS_PROVIDER", "msg91")
    monkeypatch.setattr(settings, "MSG91_AUTH_KEY", "key")
    monkeypatch.setattr(settings, "MSG91_TEMPLATE_ID", "tmpl")
    monkeypatch.setattr(
        sms_service,
        "transport",
        httpx.MockTransport(lambda _: httpx.Response(200, json={"type": "success"})),
    )
    res = await client.post(
        "/api/v1/auth/otp/generate", json={**body, "phone_number": "9876500003"}
    )
    assert res.json()["message"] == "OTP sent."
    assert json.dumps(res.json()).count("dev code") == 0
