import enum
import uuid
from datetime import date
from typing import Optional

from sqlalchemy import Date, Enum, ForeignKey, Numeric, String, Text
from app.db.types import GUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDMixin


class RecurrenceInterval(str, enum.Enum):
    none = "none"
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"
    yearly = "yearly"


class Expense(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "expenses"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(), ForeignKey("categories.id", ondelete="SET NULL"), index=True, nullable=True
    )
    goal_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(), ForeignKey("goals.id", ondelete="SET NULL"), index=True, nullable=True
    )
    is_goal_transfer: Mapped[bool] = mapped_column(default=False)

    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="UZS")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    expense_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)

    is_recurring: Mapped[bool] = mapped_column(default=False)
    recurrence_interval: Mapped[RecurrenceInterval] = mapped_column(
        Enum(RecurrenceInterval), default=RecurrenceInterval.none
    )

    merchant_name: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    payment_method: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    receipt_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    receipt_image: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_category: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)

    # ---------- Receipt scanner (Phase 3) ----------
    receipt_time: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    tax_amount: Mapped[Optional[float]] = mapped_column(Numeric(14, 2), nullable=True)
    products: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON-encoded list

    user = relationship("User", back_populates="expenses")
    category = relationship("Category", back_populates="expenses")
