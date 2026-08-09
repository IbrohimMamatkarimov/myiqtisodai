import enum
import uuid

from sqlalchemy import Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDMixin
from app.db.types import GUID


class ConfirmationDecision(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class GoalMemberWithdrawConfirmation(UUIDMixin, TimestampMixin, Base):
    """One other group-goal member's sign-off on a withdrawal request. A
    request needs every one of these to be 'approved' before an admin is
    even allowed to release the money - and a single 'rejected' kills the
    whole request immediately, no admin involved at that point."""

    __tablename__ = "goal_member_withdraw_confirmations"
    __table_args__ = (UniqueConstraint("request_id", "user_id", name="uq_withdraw_confirmation_request_user"),)

    request_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("goal_member_withdraw_requests.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    decision: Mapped[ConfirmationDecision] = mapped_column(
        Enum(ConfirmationDecision, name="memberwithdrawconfirmationdecision"),
        default=ConfirmationDecision.pending,
        nullable=False,
    )

    user = relationship("User")
