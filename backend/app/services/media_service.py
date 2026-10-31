import secrets
from pathlib import Path

from fastapi import UploadFile, status

from app.core.config import settings
from app.core.errors import AppError

ALLOWED = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/aac": ".aac",
    "audio/wav": ".wav",
}
MAX_BYTES = 10 * 1024 * 1024  # 10 MB


async def save_upload(file: UploadFile) -> str:
    """Validate and persist an upload to the media dir; return its public URL path."""
    ext = ALLOWED.get(file.content_type or "")
    if ext is None:
        raise AppError(
            status.HTTP_400_BAD_REQUEST, "UNSUPPORTED_MEDIA_TYPE", "File type not allowed."
        )
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise AppError(status.HTTP_400_BAD_REQUEST, "FILE_TOO_LARGE", "File exceeds 10 MB.")

    media_dir = Path(settings.MEDIA_DIR)
    media_dir.mkdir(parents=True, exist_ok=True)
    name = f"{secrets.token_urlsafe(16)}{ext}"
    (media_dir / name).write_bytes(data)
    return f"/media/{name}"
