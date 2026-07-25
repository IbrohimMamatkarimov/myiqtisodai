import enum
import uuid
from typing import Optional

from sqlalchemy import Enum, ForeignKey, String
from app.db.types import GUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDMixin


class CategoryType(str, enum.Enum):
    income = "income"
    expense = "expense"


class Category(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "categories"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(), ForeignKey("categories.id", ondelete="CASCADE"), nullable=True, index=True
    )

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    icon: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    type: Mapped[CategoryType] = mapped_column(Enum(CategoryType), nullable=False)
    is_default: Mapped[bool] = mapped_column(default=False)

    user = relationship("User", back_populates="categories")
    parent = relationship("Category", remote_side="Category.id", backref="subcategories")
    expenses = relationship("Expense", back_populates="category")
    incomes = relationship("Income", back_populates="category")
