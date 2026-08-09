import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.debt import DebtDirection


class DebtCreate(BaseModel):
    person_name: str = Field(min_length=1, max_length=160)
    direction: DebtDirection
    amount: float = Field(gt=0)
    currency: str = Field(default="UZS", max_length=8)
    debt_date: date
    due_date: Optional[date] = None
    notes: Optional[str] = None


class DebtUpdate(BaseModel):
    person_name: Optional[str] = None
    amount: Optional[float] = Field(default=None, gt=0)
    currency: Optional[str] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None
    is_paid: Optional[bool] = None


class DebtOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    person_name: str
    direction: DebtDirection
    amount: float
    currency: str
    debt_date: date
    due_date: Optional[date]
    notes: Optional[str]
    is_paid: bool
    created_at: datetime
