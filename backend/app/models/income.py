import uuid
from datetime import date
from typing import Optional

from sqlalchemy import Date, ForeignKey, Numeric, String, Text
from app.db.types import GUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDMixin
from app.models.expense import RecurrenceInterval


class Income(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "incomes"

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

    source_name: Mapped[str] = mapped_column(String(160), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="UZS")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    income_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)

    is_recurring: Mapped[bool] = mapped_column(default=False)
    recurrence_interval: Mapped[RecurrenceInterval] = mapped_column(default=RecurrenceInterval.none)

    user = relationship("User", back_populates="incomes")
    category = relationship("Category", back_populates="incomes")
