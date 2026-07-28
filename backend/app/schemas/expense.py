import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.expense import RecurrenceInterval


class ExpenseCreate(BaseModel):
    category_id: Optional[uuid.UUID] = None

    amount: float = Field(gt=0)

    currency: str = "UZS"

    description: Optional[str] = None

    expense_date: date

    is_recurring: bool = False

    recurrence_interval: RecurrenceInterval = RecurrenceInterval.none

    # ---------- NEW ----------
    merchant_name: Optional[str] = None

    payment_method: Optional[str] = None

    receipt_number: Optional[str] = None

    receipt_image: Optional[str] = None

    ai_category: Optional[str] = None


class ExpenseUpdate(BaseModel):
    category_id: Optional[uuid.UUID] = None

    amount: Optional[float] = Field(default=None, gt=0)

    currency: Optional[str] = None

    description: Optional[str] = None

    expense_date: Optional[date] = None

    is_recurring: Optional[bool] = None

    recurrence_interval: Optional[RecurrenceInterval] = None

    merchant_name: Optional[str] = None

    payment_method: Optional[str] = None

    receipt_number: Optional[str] = None

    receipt_image: Optional[str] = None

    ai_category: Optional[str] = None


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID

    category_id: Optional[uuid.UUID]

    amount: float

    currency: str

    description: Optional[str]

    expense_date: date

    is_recurring: bool

    recurrence_interval: RecurrenceInterval

    # ---------- NEW ----------
    merchant_name: Optional[str]

    payment_method: Optional[str]

    receipt_number: Optional[str]

    receipt_image: Optional[str]

    ai_category: Optional[str]

    created_at: datetime


class PaginatedExpenses(BaseModel):
    items: list[ExpenseOut]

    total: int

    page: int

    page_size: int

    total_pages: int
