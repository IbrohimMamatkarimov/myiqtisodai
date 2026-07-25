import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.expense import RecurrenceInterval


class IncomeCreate(BaseModel):
    category_id: Optional[uuid.UUID] = None
    source_name: str = Field(min_length=1, max_length=160)
    amount: float = Field(gt=0)
    currency: str = "UZS"
    description: Optional[str] = None
    income_date: date
    is_recurring: bool = False
    recurrence_interval: RecurrenceInterval = RecurrenceInterval.none


class IncomeUpdate(BaseModel):
    category_id: Optional[uuid.UUID] = None
    source_name: Optional[str] = None
    amount: Optional[float] = Field(default=None, gt=0)
    currency: Optional[str] = None
    description: Optional[str] = None
    income_date: Optional[date] = None
    is_recurring: Optional[bool] = None
    recurrence_interval: Optional[RecurrenceInterval] = None


class IncomeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category_id: Optional[uuid.UUID]
    source_name: str
    amount: float
    currency: str
    description: Optional[str]
    income_date: date
    is_recurring: bool
    recurrence_interval: RecurrenceInterval
    created_at: datetime
