import enum
import uuid
from typing import Optional

from sqlalchemy import Enum, ForeignKey, Numeric
from app.db.types import GUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDMixin


class BudgetPeriod(str, enum.Enum):
    weekly = "weekly"
    monthly = "monthly"
    yearly = "yearly"


class Budget(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "budgets"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(), ForeignKey("categories.id", ondelete="CASCADE"), index=True, nullable=True
    )

    limit_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    period: Mapped[BudgetPeriod] = mapped_column(Enum(BudgetPeriod), default=BudgetPeriod.monthly)
    alert_threshold_percent: Mapped[int] = mapped_column(default=80)

    user = relationship("User", back_populates="budgets")
    category = relationship("Category")
