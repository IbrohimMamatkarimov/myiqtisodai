import enum
import uuid
from typing import Optional

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDMixin
from app.db.types import GUID


class BudgetPeriod(str, enum.Enum):
    weekly = "weekly"
    monthly = "monthly"
    yearly = "yearly"
    custom = "custom"


class BudgetStatus(str, enum.Enum):
    safe = "safe"
    warning = "warning"
    exceeded = "exceeded"


class Budget(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "budgets"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # User defined budget
    limit_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

    # AI recommendation
    recommended_amount: Mapped[float] = mapped_column(
        Numeric(14, 2),
        default=0,
    )

    # Current spending
    spent_amount: Mapped[float] = mapped_column(
        Numeric(14, 2),
        default=0,
    )

    # Remaining amount
    remaining_amount: Mapped[float] = mapped_column(
        Numeric(14, 2),
        default=0,
    )

    period: Mapped[BudgetPeriod] = mapped_column(
        Enum(BudgetPeriod),
        default=BudgetPeriod.monthly,
    )

    status: Mapped[BudgetStatus] = mapped_column(
        Enum(BudgetStatus),
        default=BudgetStatus.safe,
    )

    progress_percent: Mapped[int] = mapped_column(
        Integer,
        default=0,
    )

    alert_threshold_percent: Mapped[int] = mapped_column(
        Integer,
        default=80,
    )

    color: Mapped[str] = mapped_column(
        String(30),
        default="#22B573",
    )

    auto_reset: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )

    notes: Mapped[Optional[str]] = mapped_column(
        String(300),
        nullable=True,
    )

    user = relationship(
        "User",
        back_populates="budgets",
    )

    category = relationship("Category")
