import uuid
from datetime import date
from typing import Optional

from sqlalchemy import Date, ForeignKey, Numeric, String
from app.db.types import GUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDMixin


class Goal(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "goals"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    title: Mapped[str] = mapped_column(String(160), nullable=False)
    target_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    current_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    currency: Mapped[str] = mapped_column(String(8), default="UZS", nullable=False)
    is_completed: Mapped[bool] = mapped_column(default=False)

    user = relationship("User", back_populates="goals")

    @property
    def progress_percent(self) -> float:
        if not self.target_amount:
            return 0.0
        return round(min(float(self.current_amount) / float(self.target_amount) * 100, 100), 2)
