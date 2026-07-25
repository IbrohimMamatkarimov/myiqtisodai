import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String, Text
from app.db.types import GUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDMixin


class NotificationType(str, enum.Enum):
    budget_alert = "budget_alert"
    overspending = "overspending"
    goal_reminder = "goal_reminder"
    monthly_summary = "monthly_summary"
    system = "system"


class Notification(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)

    user = relationship("User", back_populates="notifications")
