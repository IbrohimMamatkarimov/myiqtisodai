import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import Currency, Gender, Language, Theme


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)

    language: Language = Language.uz


class SpendingHabits(BaseModel):
    """Rough self-reported monthly spend per habit, collected once at
    onboarding (Screen 5) to give the AI a starting picture before real
    expense history exists. Amounts are in the user's chosen currency."""

    coffee: Optional[float] = Field(default=0, ge=0, le=1_000_000_000)
    restaurant: Optional[float] = Field(default=0, ge=0, le=1_000_000_000)
    taxi: Optional[float] = Field(default=0, ge=0, le=1_000_000_000)
    subscriptions: Optional[float] = Field(default=0, ge=0, le=1_000_000_000)
    shopping: Optional[float] = Field(default=0, ge=0, le=1_000_000_000)
    gaming: Optional[float] = Field(default=0, ge=0, le=1_000_000_000)
    travel: Optional[float] = Field(default=0, ge=0, le=1_000_000_000)


class CompleteOnboarding(BaseModel):
    """Payload for POST /users/complete-onboarding, covering all 5 screens."""

    # Screen 1
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    age: Optional[int] = Field(default=None, ge=10, le=100)
    gender: Optional[Gender] = None

    # Screen 2
    country: Optional[str] = Field(default=None, max_length=100)
    currency: Optional[Currency] = None
    occupation: Optional[str] = Field(default=None, max_length=150)
    monthly_income: Optional[float] = Field(default=None, ge=0, le=999_999_999_999)

    # Screen 3
    financial_goal: Optional[str] = None

    # Screen 4 — monthly_budget becomes an overall Budget row, not a User column
    monthly_budget: Optional[float] = Field(default=None, ge=0, le=999_999_999_999)
    salary_day: Optional[int] = Field(default=None, ge=1, le=31)
    language: Optional[Language] = None

    # Screen 5
    spending_habits: Optional[SpendingHabits] = None


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
    gender: Optional[Gender]
    country: Optional[str]
    occupation: Optional[str]
    monthly_income: Optional[float]
    salary_day: Optional[int]
    financial_goal: Optional[str]
    spending_habits: Optional[dict]
    onboarding_completed: bool

    created_at: datetime


class UserUpdate(BaseModel):
    full_name: Optional[str] = None

    language: Optional[Language] = None
    theme: Optional[Theme] = None
    currency: Optional[Currency] = None

    notifications_enabled: Optional[bool] = None

    age: Optional[int] = Field(default=None, ge=10, le=100)
    gender: Optional[Gender] = None
    country: Optional[str] = None
    occupation: Optional[str] = None
    monthly_income: Optional[float] = Field(default=None, ge=0, le=999_999_999_999)
    salary_day: Optional[int] = Field(default=None, ge=1, le=31)
    financial_goal: Optional[str] = None
    spending_habits: Optional[SpendingHabits] = None
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
