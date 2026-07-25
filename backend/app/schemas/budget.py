import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.budget import BudgetPeriod


class BudgetCreate(BaseModel):
    category_id: Optional[uuid.UUID] = None
    limit_amount: float = Field(gt=0)
    period: BudgetPeriod = BudgetPeriod.monthly
    alert_threshold_percent: int = Field(default=80, ge=1, le=100)


class BudgetUpdate(BaseModel):
    category_id: Optional[uuid.UUID] = None
    limit_amount: Optional[float] = Field(default=None, gt=0)
    period: Optional[BudgetPeriod] = None
    alert_threshold_percent: Optional[int] = Field(default=None, ge=1, le=100)


class BudgetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category_id: Optional[uuid.UUID]
    limit_amount: float
    period: BudgetPeriod
    alert_threshold_percent: int
    spent_amount: float = 0
    progress_percent: float = 0
