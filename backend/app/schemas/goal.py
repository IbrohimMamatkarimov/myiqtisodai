import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class GoalCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    target_amount: float = Field(gt=0)
    current_amount: float = Field(default=0, ge=0)
    deadline: Optional[date] = None
    icon: Optional[str] = None
    currency: str = Field(default="UZS", max_length=8)


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    target_amount: Optional[float] = Field(default=None, gt=0)
    current_amount: Optional[float] = Field(default=None, ge=0)
    deadline: Optional[date] = None
    icon: Optional[str] = None
    currency: Optional[str] = Field(default=None, max_length=8)
    is_completed: Optional[bool] = None


class GoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    target_amount: float
    current_amount: float
    deadline: Optional[date]
    icon: Optional[str]
    image_url: Optional[str] = None
    currency: str
    is_completed: bool
    is_locked: bool
    progress_percent: float


class GoalAllocate(BaseModel):
    amount: float = Field(gt=0)
    pin: str = Field(min_length=4, max_length=32)


class GoalWithdraw(BaseModel):
    pin: str = Field(min_length=4, max_length=32)
