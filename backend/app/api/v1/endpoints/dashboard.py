from datetime import date

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.budget import Budget
from app.models.category import Category
from app.models.expense import Expense
from app.models.goal import Goal
from app.models.income import Income
from app.models.user import User
from app.schemas.dashboard import CategoryBreakdown, DashboardSummary
from app.services.financial_health import calculate_financial_health_score

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _sum_in_range(db: Session, model, user_id, start: date, end: date, amount_col) -> float:
    date_col = model.expense_date if model is Expense else model.income_date
    stmt = select(func.coalesce(func.sum(amount_col), 0)).where(
        model.user_id == user_id, date_col >= start, date_col < end
    )
    return float(db.scalar(stmt) or 0)


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    month_start = today.replace(day=1)
    next_month_start = month_start + relativedelta(months=1)
    prev_month_start = month_start - relativedelta(months=1)

    total_income = _sum_in_range(db, Income, current_user.id, month_start, next_month_start, Income.amount)
    total_expenses = _sum_in_range(db, Expense, current_user.id, month_start, next_month_start, Expense.amount)
    prev_income = _sum_in_range(db, Income, current_user.id, prev_month_start, month_start, Income.amount)
    prev_expenses = _sum_in_range(db, Expense, current_user.id, prev_month_start, month_start, Expense.amount)

    def pct_change(current: float, previous: float) -> float:
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round((current - previous) / previous * 100, 1)

    # Category breakdown for this month's expenses
# Category breakdown for this month's expenses (including uncategorized)
    rows = (
        db.query(
            Category.id,
            func.coalesce(Category.name, "Uncategorized"),
            func.sum(Expense.amount),
        )
        .select_from(Expense)
        .outerjoin(Category, Expense.category_id == Category.id)
        .filter(Expense.user_id == current_user.id, Expense.expense_date >= month_start)
        .group_by(Category.id, Category.name)
        .order_by(func.sum(Expense.amount).desc())
        .limit(5)
        .all()
    )
    top_categories = []
    for cat_id, cat_name, total in rows:
        total_f = float(total)
        pct = round((total_f / total_expenses * 100), 1) if total_expenses else 0
        top_categories.append(
            CategoryBreakdown(category_id=str(cat_id), category_name=cat_name, total=total_f, percent=pct)
        )

    goals = db.scalars(select(Goal).where(Goal.user_id == current_user.id, Goal.is_completed.is_(False))).all()
    goals_on_track = sum(1 for g in goals if g.progress_percent >= 50)

    budgets = db.scalars(select(Budget).where(Budget.user_id == current_user.id)).all()
    budgets_over_limit = 0
    for b in budgets:
        spent = _sum_in_range(db, Expense, current_user.id, month_start, next_month_start, Expense.amount)
        if spent > float(b.limit_amount):
            budgets_over_limit += 1

    total_savings = max(total_income - total_expenses, 0)

    score = calculate_financial_health_score(
        total_income=total_income,
        total_expenses=total_expenses,
        total_savings=total_savings,
        goals_on_track=goals_on_track,
        goals_total=len(goals),
        budgets_over_limit=budgets_over_limit,
        budgets_total=len(budgets),
    )

    recent_count = db.scalar(
        select(func.count()).select_from(Expense).where(
            Expense.user_id == current_user.id, Expense.expense_date >= month_start
        )
    )

    return DashboardSummary(
        total_income=total_income,
        total_expenses=total_expenses,
        remaining_balance=total_income - total_expenses,
        total_savings=total_savings,
        financial_health_score=score,
        month_over_month_income_change_percent=pct_change(total_income, prev_income),
        month_over_month_expense_change_percent=pct_change(total_expenses, prev_expenses),
        top_expense_categories=top_categories,
        active_goals_count=len(goals),
        recent_transactions_count=recent_count or 0,
    )
