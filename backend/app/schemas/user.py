import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import Currency, Language, Theme


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)

    language: Language = Language.uz

    age: Optional[int] = Field(default=None, ge=10, le=100)
    occupation: Optional[str] = Field(default=None, max_length=100)
    monthly_income: Optional[float] = None
    monthly_expense_limit: Optional[float] = None

    financial_goal: Optional[str] = None
    risk_level: Optional[str] = "medium"

    city: Optional[str] = None
    family_members: Optional[int] = Field(default=1, ge=1, le=20)

    onboarding_completed: bool = False


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

    age: Optional[int]
    occupation: Optional[str]
    monthly_income: Optional[float]
    monthly_expense_limit: Optional[float]
    financial_goal: Optional[str]
    risk_level: Optional[str]
    city: Optional[str]
    family_members: Optional[int]
    onboarding_completed: bool

    created_at: datetime


class UserUpdate(BaseModel):
    full_name: Optional[str] = None

    language: Optional[Language] = None
    theme: Optional[Theme] = None
    currency: Optional[Currency] = None

    notifications_enabled: Optional[bool] = None

    age: Optional[int] = Field(default=None, ge=10, le=100)
    occupation: Optional[str] = None
    monthly_income: Optional[float] = None
    monthly_expense_limit: Optional[float] = None
    financial_goal: Optional[str] = None
    risk_level: Optional[str] = None
    city: Optional[str] = None
    family_members: Optional[int] = Field(default=None, ge=1, le=20)
    onboarding_completed: Optional[bool] = None


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
