from fastapi import APIRouter, UploadFile

from app.api.deps import CurrentUser
from app.schemas.common import ErrorResponse
from app.services import media_service

router = APIRouter(prefix="/media", tags=["media"])


@router.post("/upload", response_model=dict[str, str], responses={400: {"model": ErrorResponse}})
async def upload_media(file: UploadFile, user: CurrentUser) -> dict[str, str]:
    """Upload an image or audio clip; returns `{ url }` to store on a tweak/profile."""
    url = await media_service.save_upload(file)
    return {"url": url}
