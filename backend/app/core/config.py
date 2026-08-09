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

    # Google Sign-In (OAuth client, console.cloud.google.com > APIs & Services
    # > Clients). Only the Client ID is needed server-side - it's used as the
    # expected "audience" when verifying the ID token Google sends back after
    # someone signs in. The Client Secret isn't used at all for this flow
    # (that's only needed for server-side redirect-based OAuth, not the
    # Google Identity Services "Sign in with Google" button/One Tap flow this
    # app uses) - kept here anyway since Google issues both together and it
    # doesn't hurt to have it available if a different flow is added later.
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

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
