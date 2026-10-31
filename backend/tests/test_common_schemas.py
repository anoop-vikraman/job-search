from datetime import UTC, datetime, timedelta, timezone

from pydantic import BaseModel

from app.schemas.common import UtcDatetime


class _Stamp(BaseModel):
    at: UtcDatetime


def test_utc_datetime_serializes_as_z_regardless_of_input_zone() -> None:
    ist = timezone(timedelta(hours=5, minutes=30))
    utc_value = datetime(2026, 10, 22, 9, 30, tzinfo=UTC)
    assert _Stamp(at=utc_value).model_dump(mode="json") == {"at": "2026-10-22T09:30:00Z"}
    assert _Stamp(at=utc_value.astimezone(ist)).model_dump(mode="json") == {
        "at": "2026-10-22T09:30:00Z"
    }
