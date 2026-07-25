import enum
import uuid

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDMixin


class Language(str, enum.Enum):
    uz = "uz"
    en = "en"
    ru = "ru"


class Theme(str, enum.Enum):
    light = "light"
    dark = "dark"


class Currency(str, enum.Enum):
    UZS = "UZS"
    USD = "USD"
    EUR = "EUR"


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)

    language: Mapped[Language] = mapped_column(Enum(Language), default=Language.uz)
    theme: Mapped[Theme] = mapped_column(Enum(Theme), default=Theme.light)
    currency: Mapped[Currency] = mapped_column(Enum(Currency), default=Currency.UZS)

    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    expenses = relationship("Expense", back_populates="user", cascade="all, delete-orphan")
    incomes = relationship("Income", back_populates="user", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    ai_conversations = relationship("AIConversation", back_populates="user", cascade="all, delete-orphan")
