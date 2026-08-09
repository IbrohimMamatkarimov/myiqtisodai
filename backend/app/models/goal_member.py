import uuid

from sqlalchemy import ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDMixin
from app.db.types import GUID


class GoalMember(UUIDMixin, TimestampMixin, Base):
    """One person's stake in a family/group goal. contributed_amount is
    THIS member's own money in the shared box - the goal's total
    current_amount is the sum across all members, but each person can only
    ever request back what's in their own row here, never anyone else's."""

    __tablename__ = "goal_members"
    __table_args__ = (UniqueConstraint("goal_id", "user_id", name="uq_goal_members_goal_user"),)

    goal_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("goals.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    contributed_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0)

    goal = relationship("Goal", back_populates="members")
    user = relationship("User")
