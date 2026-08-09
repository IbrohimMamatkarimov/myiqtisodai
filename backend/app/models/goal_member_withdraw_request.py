import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDMixin
from app.db.types import GUID


class MemberWithdrawRequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class GoalMemberWithdrawRequest(UUIDMixin, TimestampMixin, Base):
    """A group-goal member asking for their own contributed share back.
    Unlike a personal goal (self-serve with a PIN), a group member's money
    is someone else's to see too, so there's no self-serve path at all -
    every withdrawal from a family goal goes through an admin, who approves
    and the backend then moves exactly `amount` (never more than that
    member's own contributed_amount) from the goal back to that member's
    balance as a real income entry."""

    __tablename__ = "goal_member_withdraw_requests"

    goal_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("goals.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    goal_title: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="UZS", nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[MemberWithdrawRequestStatus] = mapped_column(
        Enum(MemberWithdrawRequestStatus), default=MemberWithdrawRequestStatus.pending, nullable=False
    )
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    goal = relationship("Goal", foreign_keys=[goal_id])
    user = relationship("User", foreign_keys=[user_id])
