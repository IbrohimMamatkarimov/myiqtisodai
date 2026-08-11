import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, UUIDMixin
from app.db.types import GUID


class GoalMessage(UUIDMixin, Base):
    """One chat message inside a group goal's box - visible only to its
    accepted members. Deliberately simple (no edit/delete/read-receipts):
    this is a quick "let's talk about the money" thread, not a general
    messaging system."""

    __tablename__ = "goal_messages"

    goal_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("goals.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
