import uuid

from fastapi import APIRouter, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.core.errors import AppError
from app.models.address import Address
from app.schemas.address import AddressCreate, AddressResponse
from app.schemas.common import ErrorResponse

router = APIRouter(prefix="/addresses", tags=["addresses"])


@router.get("", response_model=list[AddressResponse])
async def list_addresses(user: CurrentUser, db: DbSession) -> list[AddressResponse]:
    """List the authenticated user's saved addresses."""
    rows = (
        await db.scalars(
            select(Address).where(Address.user_id == user.id).order_by(Address.created_at.desc())
        )
    ).all()
    return [AddressResponse.model_validate(a) for a in rows]


@router.post(
    "",
    response_model=AddressResponse,
    status_code=status.HTTP_201_CREATED,
    responses={422: {"model": ErrorResponse}},
)
async def create_address(data: AddressCreate, user: CurrentUser, db: DbSession) -> AddressResponse:
    """Create a saved address for the authenticated user."""
    address = Address(user_id=user.id, **data.model_dump())
    db.add(address)
    await db.commit()
    await db.refresh(address)
    return AddressResponse.model_validate(address)


@router.delete(
    "/{address_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: {"model": ErrorResponse}},
)
async def delete_address(address_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    """Delete one of the authenticated user's addresses."""
    address = await db.get(Address, address_id)
    if address is None or address.user_id != user.id:
        raise AppError(status.HTTP_404_NOT_FOUND, "ADDRESS_NOT_FOUND", "Address not found.")
    await db.delete(address)
    await db.commit()
