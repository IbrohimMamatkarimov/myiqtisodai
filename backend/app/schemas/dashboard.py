from datetime import date
from typing import Optional

from pydantic import BaseModel


class CategoryBreakdown(BaseModel):
    category_id: Optional[str]
    category_name: str
    total: float
    percent: float


class BudgetStatus(BaseModel):
    category_name: str
    limit_amount: float
    spent_amount: float
    remaining_amount: float
    progress_percent: float
    status: str


class WeeklyTrend(BaseModel):
    label: str
    income: float
    expenses: float


class GoalProgress(BaseModel):
    title: str
    target_amount: float
    current_amount: float
    progress_percent: float
    deadline: Optional[date]


class DashboardSummary(BaseModel):
    # Main cards
    total_income: float
    total_expenses: float
    remaining_balance: float
    total_savings: float
    financial_health_score: int

    # Month comparison
    month_over_month_income_change_percent: float
    month_over_month_expense_change_percent: float

    # Prediction
    predicted_month_end_balance: float
    predicted_month_end_savings: float
    safe_to_spend_today: float
    recommended_daily_budget: float

    # Statistics
    top_expense_categories: list[CategoryBreakdown]
    budgets: list[BudgetStatus]
    weekly_trends: list[WeeklyTrend]
    active_goals: list[GoalProgress]

    # Counters
    active_goals_count: int
    recent_transactions_count: int
    completed_goals_count: int

    # Alerts
    budget_alerts: list[str]
    ai_summary: str


class ReportRequest(BaseModel):
    start_date: date
    end_date: date
    granularity: str = "monthly"
