import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDMixin
from app.db.types import GUID


class ReportStatus(str, enum.Enum):
    open = "open"
    solved = "solved"


class Report(UUIDMixin, TimestampMixin, Base):
    """A bug report / issue submitted by a user, reviewed by admins."""

    __tablename__ = "reports"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    subject: Mapped[str] = mapped_column(Text, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus), default=ReportStatus.open, nullable=False
    )
    admin_reply: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User")
