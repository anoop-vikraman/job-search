import uuid

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel, UtcDatetime


class AddressCreate(BaseModel):
    save_as: str = Field(min_length=1, max_length=40)
    contact_name: str | None = None
    phone_number: str | None = None
    formatted_address: str = Field(min_length=1)
    house_no: str | None = None
    area: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class AddressResponse(ORMModel):
    id: uuid.UUID
    save_as: str
    contact_name: str | None
    phone_number: str | None
    formatted_address: str
    house_no: str | None
    area: str | None
    city: str | None
    state: str | None
    pincode: str | None
    latitude: float | None
    longitude: float | None
    created_at: UtcDatetime
