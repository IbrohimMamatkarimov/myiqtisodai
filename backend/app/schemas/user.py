from datetime import datetime
from typing import Optional
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import Currency, Gender, Language, Theme


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

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


class GoogleAuthRequest(BaseModel):
    """The ID token (a signed JWT) that Google's "Sign in with Google"
    button hands back to the frontend - verified server-side against
    GOOGLE_CLIENT_ID before it's trusted for anything."""
    credential: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str

    is_email_verified: bool
    is_superuser: bool

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

    deletion_requested: bool
    deletion_reason: Optional[str]
    deletion_requested_at: Optional[datetime]

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


class AccountDeletionRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)


class DeletionRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    deletion_reason: Optional[str]
    deletion_requested_at: Optional[datetime]


class AdminUserOut(BaseModel):
    """User row for the admin panel. Deliberately excludes hashed_password -
    passwords are one-way hashed (bcrypt) and are never readable by anyone,
    including admins; this is standard practice and won't change even for
    the admin panel. Admins can force-set a NEW password instead (see
    AdminSetPassword) rather than viewing the existing one."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str

    is_active: bool
    is_email_verified: bool
    is_superuser: bool
    onboarding_completed: bool

    phone: Optional[str]
    last_login_at: Optional[datetime]

    currency: Currency
    language: Language
    financial_goal: Optional[str]

    # Full onboarding profile - everything the user told the app about themselves
    age: Optional[int]
    gender: Optional[Gender]
    country: Optional[str]
    occupation: Optional[str]
    monthly_income: Optional[float]
    salary_day: Optional[int]
    spending_habits: Optional[dict]
    notifications_enabled: bool
    theme: Theme

    deletion_requested: bool
    deletion_reason: Optional[str]
    deletion_requested_at: Optional[datetime]

    created_at: datetime


class AdminUserDetail(AdminUserOut):
    total_income: float
    total_expenses: float
    expense_count: int
    income_count: int
    goal_count: int


class AdminUserUpdate(BaseModel):
    """Admin editing a user's profile fields directly."""

    full_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=30)
    country: Optional[str] = Field(default=None, max_length=100)
    occupation: Optional[str] = Field(default=None, max_length=150)
    age: Optional[int] = Field(default=None, ge=10, le=100)
    gender: Optional[Gender] = None
    monthly_income: Optional[float] = Field(default=None, ge=0, le=999_999_999_999)
    salary_day: Optional[int] = Field(default=None, ge=1, le=31)
    financial_goal: Optional[str] = None


class AdminChangeEmail(BaseModel):
    new_email: EmailStr


class AdminSetPassword(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


class AdminNotifyUser(BaseModel):
    """Admin sends a one-off message to a user - shows up in their
    notification bell. Used for contacting users about things like a
    declined account-deletion request, or any other manual outreach."""

    title: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=2000)


class AdminDeletionDecision(BaseModel):
    """Optional message sent to the user alongside the approve/reject
    decision - e.g. explaining why a deletion request was declined."""

    message: Optional[str] = Field(default=None, max_length=2000)


class BroadcastNotification(BaseModel):
    """Same notification sent to every active user at once."""

    title: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=2000)


class RecentActivityItem(BaseModel):
    kind: str
    label: str
    at: datetime


class AdminDashboardStats(BaseModel):
    total_users: int
    active_users: int
    ai_chats_today: int
    total_expenses: float
    total_incomes: float
    reports_waiting: int
    recent_activity: list[RecentActivityItem]


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
