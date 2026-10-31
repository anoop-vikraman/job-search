"""Error tracking (Sentry). No-op unless SENTRY_DSN is set."""

import logging
from typing import Any

import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration

from app.core.config import settings

logger = logging.getLogger(__name__)

_SENSITIVE_KEYS = {"password", "otp", "token", "refresh_token", "access_token", "id_number"}


def _scrub(event: dict[str, Any], _hint: dict[str, Any]) -> dict[str, Any]:
    """Drop auth headers and obvious secrets from request bodies before sending."""
    request = event.get("request") or {}
    headers = request.get("headers") or {}
    for key in list(headers):
        if key.lower() in {"authorization", "cookie", "x-razorpay-signature"}:
            headers[key] = "[filtered]"
    data = request.get("data")
    if isinstance(data, dict):
        for key in list(data):
            if key.lower() in _SENSITIVE_KEYS:
                data[key] = "[filtered]"
    return event


def init_sentry(component: str) -> bool:
    """Initialise Sentry for `component` ("api" or "worker"). Returns True if enabled."""
    if not settings.SENTRY_DSN:
        return False
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        send_default_pii=False,
        before_send=_scrub,  # type: ignore[arg-type]
        integrations=[LoggingIntegration(level=logging.INFO, event_level=logging.ERROR)],
    )
    sentry_sdk.set_tag("component", component)
    logger.info("Sentry enabled (%s, %s)", component, settings.SENTRY_ENVIRONMENT)
    return True
