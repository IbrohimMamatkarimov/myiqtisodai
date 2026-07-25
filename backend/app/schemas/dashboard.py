from datetime import date
from typing import Optional

from pydantic import BaseModel


class CategoryBreakdown(BaseModel):
    category_id: Optional[str]
    category_name: str
    total: float
    percent: float


class DashboardSummary(BaseModel):
    total_income: float
    total_expenses: float
    remaining_balance: float
    total_savings: float
    financial_health_score: int
    month_over_month_income_change_percent: float
    month_over_month_expense_change_percent: float
    top_expense_categories: list[CategoryBreakdown]
    active_goals_count: int
    recent_transactions_count: int


class ReportRequest(BaseModel):
    start_date: date
    end_date: date
    granularity: str = "monthly"  # daily | weekly | monthly | yearly
