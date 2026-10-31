from fastapi import APIRouter, Path, Response, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.common import ErrorResponse
from app.schemas.device import DeviceRegister, DeviceResponse
from app.services import device_service

router = APIRouter(prefix="/devices", tags=["devices"])


@router.post(
    "",
    response_model=DeviceResponse,
    status_code=status.HTTP_201_CREATED,
    responses={200: {"model": DeviceResponse}, 422: {"model": ErrorResponse}},
)
async def register_device(
    data: DeviceRegister, user: CurrentUser, db: DbSession, response: Response
) -> DeviceResponse:
    """Register this device's Expo push token for the signed-in user.

    Idempotent: 201 for a new token, 200 when the token was already known (it is
    reassigned to the caller).
    """
    device, created = await device_service.register(db, user.id, data.token, data.platform)
    if not created:
        response.status_code = status.HTTP_200_OK
    return DeviceResponse.model_validate(device)


@router.delete(
    "/{token}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: {"model": ErrorResponse}},
)
async def unregister_device(
    user: CurrentUser, db: DbSession, token: str = Path(max_length=255)
) -> None:
    """Stop pushes to this device (call before logging out)."""
    await device_service.unregister(db, user.id, token)
