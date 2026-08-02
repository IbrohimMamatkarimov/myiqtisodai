from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "MyIqtisod"

    ENVIRONMENT: str = "development"

    DEBUG: bool = True

    SECRET_KEY: str

    ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    DATABASE_URL: str

    FRONTEND_URL: str = "http://localhost:3000"

    ALLOWED_ORIGINS: str = "http://localhost:3000"

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@myiqtisod.uz"

    # Brevo (transactional email over HTTPS API - works on hosts like Render
    # free tier that block outbound SMTP ports 25/465/587)
    BREVO_API_KEY: str = ""

    # ---------- AI ----------

    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # OCR
    OCR_SPACE_API_KEY: str = ""

    # Pexels (real, curated, safe stock photos for goal cover images -
    # https://pexels.com/api, free tier, no approval process needed)
    PEXELS_API_KEY: str = ""

    # Receipt image folder
    UPLOAD_DIR: str = "uploads"

    # ---------- Future ----------

    MARKET_API_KEY: str = ""

    EXCHANGE_RATE_API_KEY: str = ""

    RATE_LIMIT_PER_MINUTE: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def cors_origins(self) -> List[str]:
        return [
            origin.strip()
            for origin in self.ALLOWED_ORIGINS.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings():
    return Settings()


settings = get_settings()
