import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text
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
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    currency: Mapped[str] = mapped_column(String(8), default="UZS", nullable=False)
    is_completed: Mapped[bool] = mapped_column(default=False)

    # ---------- Fund locking (allocate money from balance into the goal) ----------
    pin_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_locked: Mapped[bool] = mapped_column(default=False)

    # ---------- Hard time lock / cooling-off period ----------
    # Chosen at goal creation (e.g. 30/60/90 days). If set, withdraw_funds
    # refuses ANY withdrawal - even with the correct PIN - until this passes.
    # This is enforced independently of is_locked/pin_hash, which only gate
    # whether money CAN be withdrawn at all, not WHEN.
    lock_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # ---------- Family/group goal (multiple contributors, one shared box) ----------
    is_group: Mapped[bool] = mapped_column(default=False)

    user = relationship("User", back_populates="goals")
    members = relationship("GoalMember", back_populates="goal", cascade="all, delete-orphan")

    @property
    def progress_percent(self) -> float:
        if not self.target_amount:
            return 0.0
        return round(min(float(self.current_amount) / float(self.target_amount) * 100, 100), 2)

    @property
    def has_pin(self) -> bool:
        """Whether a withdrawal PIN has already been set. New goals get one
        at creation time; goals created before that feature existed won't
        have one until their first allocation (frontend uses this to decide
        whether to show the legacy inline PIN-setup fallback)."""
        return bool(self.pin_hash)
