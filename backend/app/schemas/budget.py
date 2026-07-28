import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.budget import BudgetPeriod, BudgetStatus


class BudgetCreate(BaseModel):
    category_id: Optional[uuid.UUID] = None

    limit_amount: float = Field(gt=0)

    period: BudgetPeriod = BudgetPeriod.monthly

    alert_threshold_percent: int = Field(
        default=80,
        ge=1,
        le=100,
    )

    color: str = "#22B573"

    auto_reset: bool = True

    notes: Optional[str] = None


class BudgetUpdate(BaseModel):
    category_id: Optional[uuid.UUID] = None

    limit_amount: Optional[float] = Field(
        default=None,
        gt=0,
    )

    period: Optional[BudgetPeriod] = None

    alert_threshold_percent: Optional[int] = Field(
        default=None,
        ge=1,
        le=100,
    )

    color: Optional[str] = None

    auto_reset: Optional[bool] = None

    notes: Optional[str] = None


class BudgetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID

    category_id: Optional[uuid.UUID]

    limit_amount: float

    recommended_amount: float

    spent_amount: float

    remaining_amount: float

    progress_percent: float

    period: BudgetPeriod

    status: BudgetStatus

    alert_threshold_percent: int

    color: str

    auto_reset: bool

    notes: Optional[str]
