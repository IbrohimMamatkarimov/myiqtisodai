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


class ExpenseUpdate(BaseModel):
    category_id: Optional[uuid.UUID] = None
    amount: Optional[float] = Field(default=None, gt=0)
    currency: Optional[str] = None
    description: Optional[str] = None
    expense_date: Optional[date] = None
    is_recurring: Optional[bool] = None
    recurrence_interval: Optional[RecurrenceInterval] = None


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
    created_at: datetime


class PaginatedExpenses(BaseModel):
    items: list[ExpenseOut]
    total: int
    page: int
    page_size: int
    total_pages: int
