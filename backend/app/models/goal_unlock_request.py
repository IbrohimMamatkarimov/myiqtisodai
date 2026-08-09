import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDMixin
from app.db.types import GUID


class UnlockRequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class GoalUnlockRequest(UUIDMixin, TimestampMixin, Base):
    """A user's request to open a still-time-locked savings goal early
    (financial hardship, etc). Created via the 'contact support' link on a
    locked goal; an admin reviews it in the admin panel and approves
    (clears the goal's time lock, so it can be withdrawn with the PIN as
    normal) or rejects it (goal stays locked, user gets a notification)."""

    __tablename__ = "goal_unlock_requests"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    goal_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("goals.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # Denormalized so the request stays meaningful even if the goal is later
    # withdrawn/deleted.
    goal_title: Mapped[str] = mapped_column(Text, nullable=False)

    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[UnlockRequestStatus] = mapped_column(
        Enum(UnlockRequestStatus), default=UnlockRequestStatus.pending, nullable=False
    )
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User", foreign_keys=[user_id])
    goal = relationship("Goal", foreign_keys=[goal_id])
