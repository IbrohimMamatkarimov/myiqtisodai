import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDMixin
from app.db.types import GUID


class GoalMemberStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"


class GoalMember(UUIDMixin, TimestampMixin, Base):
    """One person's stake in a family/group goal. contributed_amount is
    THIS member's own money in the shared box - the goal's total
    current_amount is the sum across all members, but each person can only
    ever request back what's in their own row here, never anyone else's.

    Every invite starts as pending - the invited person has to explicitly
    accept before they're a real member. Owner adds a pending row +
    notification; a pending member can't contribute or see the goal in
    their own list until they accept."""

    __tablename__ = "goal_members"
    __table_args__ = (UniqueConstraint("goal_id", "user_id", name="uq_goal_members_goal_user"),)

    goal_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("goals.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    contributed_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    status: Mapped[GoalMemberStatus] = mapped_column(
        Enum(GoalMemberStatus, name="goalmemberstatus"), default=GoalMemberStatus.pending, nullable=False
    )
    # This member's own PIN for confirming a "collect the whole box" request
    # - separate from a personal goal's pin_hash. Set the first time they
    # ever confirm one of these (same lazy-capture pattern as a legacy
    # personal goal's PIN), then required on every confirmation after that.
    confirm_pin_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

    goal = relationship("Goal", back_populates="members")
    user = relationship("User")
