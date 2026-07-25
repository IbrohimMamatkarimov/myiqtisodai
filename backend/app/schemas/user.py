import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, ConfigDict

from app.models.user import Currency, Language, Theme


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)
    language: Language = Language.uz


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    is_email_verified: bool
    language: Language
    theme: Theme
    currency: Currency
    notifications_enabled: bool
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    language: Optional[Language] = None
    theme: Optional[Theme] = None
    currency: Optional[Currency] = None
    notifications_enabled: Optional[bool] = None


class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class ForgotPassword(BaseModel):
    email: EmailStr


class ResetPassword(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class VerifyEmail(BaseModel):
    token: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str
