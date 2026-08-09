import uuid
import enum
from datetime import date
from typing import Optional

from sqlalchemy import Boolean, Date, Enum, ForeignKey, Numeric, String, Text
from app.db.types import GUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDMixin


class DebtDirection(str, enum.Enum):
    lent = "lent"          # money I gave to someone else - they owe me
    borrowed = "borrowed"  # money someone gave me - I owe them


class Debt(UUIDMixin, TimestampMixin, Base):
    """Qarz daftarcha - a simple personal ledger of money lent to or borrowed
    from specific people. Deliberately NOT wired into income/expense totals:
    lending or borrowing isn't revenue or spending, it's a separate personal
    record most people in Uzbekistan already keep informally (a physical
    notebook), so this just digitizes that, it doesn't touch the balance."""

    __tablename__ = "debts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    person_name: Mapped[str] = mapped_column(String(160), nullable=False)
    direction: Mapped[DebtDirection] = mapped_column(Enum(DebtDirection), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="UZS", nullable=False)

    debt_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False)

    user = relationship("User", back_populates="debts")
