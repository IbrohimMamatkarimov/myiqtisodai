import uuid

from sqlalchemy import Boolean, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDMixin
from app.db.types import GUID


class ChatMessage(UUIDMixin, TimestampMixin, Base):
    """One message in a support conversation between a regular user and any
    admin. Conversations aren't per-admin - all admins share one thread per
    user (user_id), same as a typical single-inbox support chat. sender_id
    tells you exactly who wrote it (the user themself, or which admin)."""

    __tablename__ = "chat_messages"

    # The user this conversation belongs to (always the non-admin side,
    # regardless of who sent this particular message).
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    # Who actually wrote this message - the user, or an admin.
    sender_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    sender_is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False)

    body: Mapped[str] = mapped_column(Text, nullable=False)

    # Read receipts, tracked separately for each side of the conversation.
    is_read_by_user: Mapped[bool] = mapped_column(Boolean, default=False)
    is_read_by_admin: Mapped[bool] = mapped_column(Boolean, default=False)

    user = relationship("User", foreign_keys=[user_id], back_populates="chat_messages")
