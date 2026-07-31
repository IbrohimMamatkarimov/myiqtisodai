import enum

from sqlalchemy import Boolean, Enum, Integer, JSON, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDMixin


class Language(str, enum.Enum):
    uz = "uz"
    en = "en"
    ru = "ru"


class Theme(str, enum.Enum):
    light = "light"
    dark = "dark"


class Gender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"
    prefer_not_to_say = "prefer_not_to_say"


class Currency(str, enum.Enum):
    UZS = "UZS"
    USD = "USD"
    EUR = "EUR"


class FinancialGoal(str, enum.Enum):
    save_money = "save_money"
    reduce_spending = "reduce_spending"
    emergency_fund = "emergency_fund"
    buy_house = "buy_house"
    buy_car = "buy_car"
    travel = "travel"
    education = "education"
    invest = "invest"
    debt_free = "debt_free"
    other = "other"


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    # Authentication
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Permissions
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)

    # Preferences
    language: Mapped[Language] = mapped_column(Enum(Language), default=Language.uz)
    theme: Mapped[Theme] = mapped_column(Enum(Theme), default=Theme.light)
    currency: Mapped[Currency] = mapped_column(Enum(Currency), default=Currency.UZS)

    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # --------------------------
    # Onboarding Information
    # --------------------------

    age: Mapped[int | None] = mapped_column(Integer, nullable=True)

    gender: Mapped[Gender | None] = mapped_column(
        Enum(Gender),
        nullable=True,
    )

    country: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    occupation: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    monthly_income: Mapped[float | None] = mapped_column(
        Numeric(14, 2),
        nullable=True,
    )

    salary_day: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    financial_goal: Mapped[FinancialGoal | None] = mapped_column(
        Enum(FinancialGoal),
        nullable=True,
    )

    # Rough self-reported monthly spend per habit category, e.g.
    # {"coffee": 150000, "restaurant": 400000, "taxi": 0, ...}
    # Collected once at onboarding to give the AI a starting picture
    # before real expense history exists.
    spending_habits: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    onboarding_completed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )

    # Relationships
    expenses = relationship(
        "Expense",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    incomes = relationship(
        "Income",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    categories = relationship(
        "Category",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    goals = relationship(
        "Goal",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    budgets = relationship(
        "Budget",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    notifications = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    ai_conversations = relationship(
        "AIConversation",
        back_populates="user",
        cascade="all, delete-orphan",
    )
