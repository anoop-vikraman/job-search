import re
import uuid
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import ORMModel, UtcDatetime

EXPO_TOKEN_RE = re.compile(r"^Expo(nent)?PushToken\[[A-Za-z0-9_\-]+\]$")


class DeviceRegister(BaseModel):
    token: str = Field(min_length=1, max_length=255)
    platform: Literal["ios", "android", "web"]

    @field_validator("token")
    @classmethod
    def _expo_token(cls, v: str) -> str:
        if not EXPO_TOKEN_RE.match(v):
            raise ValueError("Must be an Expo push token (ExponentPushToken[...]).")
        return v


class DeviceResponse(ORMModel):
    id: uuid.UUID
    token: str
    platform: str
    created_at: UtcDatetime
    last_seen_at: UtcDatetime
