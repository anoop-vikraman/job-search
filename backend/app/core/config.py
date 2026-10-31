from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/tweak_db"

    SECRET_KEY: str = "change_me_to_a_long_random_secret_at_least_32_chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:8081"

    # Platform fee taken from the provider's payout on completion (basis points; 500 = 5%).
    PLATFORM_FEE_BPS: int = 500

    # Login/OTP throttling.
    RATE_LIMIT_MAX_ATTEMPTS: int = 5
    RATE_LIMIT_WINDOW_SECONDS: int = 300

    # Local media upload directory (served at /media).
    MEDIA_DIR: str = "media_uploads"

    # Expo push (sent after each committed Notification). Disable to skip all push HTTP calls.
    EXPO_PUSH_ENABLED: bool = True
    EXPO_PUSH_URL: str = "https://exp.host/--/api/v2/push/send"
    # Optional: required only if "enhanced push security" is enabled on the EAS project.
    EXPO_ACCESS_TOKEN: str | None = None

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
