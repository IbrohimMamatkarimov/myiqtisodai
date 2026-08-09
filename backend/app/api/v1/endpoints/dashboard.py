from datetime import date, timedelta

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
from app.schemas.dashboard import BudgetStatus, CategoryBreakdown, DashboardSummary, GoalProgress, WeeklyTrend
from app.services.financial_health import calculate_financial_health_score
from app.utils.currency import RATES_TO_UZS, amount_in_uzs

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _sum_in_range(db: Session, model, user_id, start: date, end: date, amount_col) -> float:
    date_col = model.expense_date if model is Expense else model.income_date
    uzs_expr = amount_in_uzs(model, amount_col)
    stmt = select(func.coalesce(func.sum(uzs_expr), 0)).where(
        model.user_id == user_id, date_col >= start, date_col < end
    )
    return float(db.scalar(stmt) or 0)


def _sum_all_time(db: Session, model, user_id, amount_col) -> float:
    uzs_expr = amount_in_uzs(model, amount_col)
    stmt = select(func.coalesce(func.sum(uzs_expr), 0)).where(model.user_id == user_id)
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
            func.sum(amount_in_uzs(Expense, Expense.amount)),
        )
        .select_from(Expense)
        .outerjoin(Category, Expense.category_id == Category.id)
        .filter(Expense.user_id == current_user.id, Expense.expense_date >= month_start)
        .group_by(Category.id, Category.name)
        .order_by(func.sum(amount_in_uzs(Expense, Expense.amount)).desc())
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

    # Locked totals must include COMPLETED goals too - a goal is marked
    # completed the instant current_amount reaches target_amount, but the
    # money is still genuinely locked in it until the user withdraws it.
    all_goals_for_lock_total = db.scalars(select(Goal).where(Goal.user_id == current_user.id)).all()
    total_locked_in_goals = sum(
        float(g.current_amount) * RATES_TO_UZS.get(g.currency, 1)
        for g in all_goals_for_lock_total
        if g.is_locked
    )

    budgets_rows = db.scalars(select(Budget).where(Budget.user_id == current_user.id)).all()
    budgets_over_limit = 0
    budget_statuses: list[BudgetStatus] = []
    for b in budgets_rows:
        spent = _sum_in_range(db, Expense, current_user.id, month_start, next_month_start, Expense.amount)
        limit = float(b.limit_amount)
        remaining = max(limit - spent, 0)
        progress = round((spent / limit * 100), 1) if limit else 0.0
        status = "over" if spent > limit else ("warning" if progress >= 80 else "ok")
        if spent > limit:
            budgets_over_limit += 1
        category_name = "Overall"
        if getattr(b, "category_id", None):
            cat = db.get(Category, b.category_id)
            category_name = cat.name if cat else "Overall"
        budget_statuses.append(
            BudgetStatus(
                category_name=category_name,
                limit_amount=limit,
                spent_amount=spent,
                remaining_amount=remaining,
                progress_percent=progress,
                status=status,
            )
        )

    # Last 7 days, day by day, for weekly trend charts
    weekly_trends: list[WeeklyTrend] = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_end = day + timedelta(days=1)
        day_income = _sum_in_range(db, Income, current_user.id, day, day_end, Income.amount)
        day_expenses = _sum_in_range(db, Expense, current_user.id, day, day_end, Expense.amount)
        weekly_trends.append(
            WeeklyTrend(label=day.strftime("%a"), income=day_income, expenses=day_expenses)
        )

    # Today's spending, broken down by category
    today_start = today
    today_end = today + timedelta(days=1)
    today_rows = (
        db.query(
            Category.id,
            func.coalesce(Category.name, "Uncategorized"),
            func.sum(amount_in_uzs(Expense, Expense.amount)),
        )
        .select_from(Expense)
        .outerjoin(Category, Expense.category_id == Category.id)
        .filter(
            Expense.user_id == current_user.id,
            Expense.expense_date >= today_start,
            Expense.expense_date < today_end,
        )
        .group_by(Category.id, Category.name)
        .order_by(func.sum(amount_in_uzs(Expense, Expense.amount)).desc())
        .all()
    )
    today_total = sum(float(r[2]) for r in today_rows)
    today_categories = [
        CategoryBreakdown(
            category_id=str(cid) if cid else None,
            category_name=cname,
            total=float(total),
            percent=round((float(total) / today_total * 100), 1) if today_total else 0,
        )
        for cid, cname, total in today_rows
    ]

    total_savings = total_locked_in_goals

    # "Balance" is what you actually have overall, not just this month's
    # cash flow - using the monthly figures here made it look wrong/static
    # whenever a goal allocation (or any income/expense) fell in a
    # different month than the one currently being viewed.
    all_time_income = _sum_all_time(db, Income, current_user.id, Income.amount)
    all_time_expenses = _sum_all_time(db, Expense, current_user.id, Expense.amount)
    remaining_balance_all_time = all_time_income - all_time_expenses

    score = calculate_financial_health_score(
        total_income=total_income,
        total_expenses=total_expenses,
        total_savings=total_savings,
        goals_on_track=goals_on_track,
        goals_total=len(goals),
        budgets_over_limit=budgets_over_limit,
        budgets_total=len(budgets_rows),
    )

    # Real active goals (used to power proactive AI Coach projections on the frontend)
    active_goals = [
        GoalProgress(
            title=g.title,
            target_amount=float(g.target_amount),
            current_amount=float(g.current_amount),
            progress_percent=g.progress_percent,
            deadline=g.deadline,
        )
        for g in goals
    ]

    budget_alerts = [
        f"{b.category_name}: {b.progress_percent:.0f}% of budget used"
        for b in budget_statuses
        if b.status in ("warning", "over")
    ]

    recent_count = db.scalar(
        select(func.count()).select_from(Expense).where(
            Expense.user_id == current_user.id, Expense.expense_date >= month_start
        )
    )

    completed_goals_count = db.scalar(
        select(func.count()).select_from(Goal).where(
            Goal.user_id == current_user.id, Goal.is_completed.is_(True)
        )
    )

    # All-time transaction count, and a Duolingo-style day streak: how many
    # consecutive days (ending today, or yesterday if nothing's logged yet
    # today) had at least one expense or income logged.
    expense_dates = set(
        db.scalars(select(Expense.expense_date).where(Expense.user_id == current_user.id).distinct())
    )
    income_dates = set(
        db.scalars(select(Income.income_date).where(Income.user_id == current_user.id).distinct())
    )
    logged_dates = expense_dates | income_dates

    total_transactions_all_time = db.scalar(
        select(func.count()).select_from(Expense).where(Expense.user_id == current_user.id)
    ) + db.scalar(
        select(func.count()).select_from(Income).where(Income.user_id == current_user.id)
    )

    current_streak_days = 0
    cursor = today if today in logged_dates else today - timedelta(days=1)
    while cursor in logged_dates:
        current_streak_days += 1
        cursor -= timedelta(days=1)

    return DashboardSummary(
        total_income=total_income,
    total_expenses=total_expenses,
    remaining_balance=remaining_balance_all_time,
    total_savings=total_savings,
    total_locked_in_goals=total_locked_in_goals,
    financial_health_score=score,

    month_over_month_income_change_percent=pct_change(total_income, prev_income),
    month_over_month_expense_change_percent=pct_change(total_expenses, prev_expenses),

    predicted_month_end_balance=remaining_balance_all_time,
    predicted_month_end_savings=total_savings,
    safe_to_spend_today=max(0, remaining_balance_all_time),
    recommended_daily_budget=max(0, remaining_balance_all_time / 30),

    top_expense_categories=top_categories,
    today_categories=today_categories,
    today_total=today_total,
    budgets=budget_statuses,
    weekly_trends=weekly_trends,
    active_goals=active_goals,

    active_goals_count=len(goals),
    recent_transactions_count=recent_count or 0,
    completed_goals_count=completed_goals_count or 0,

    current_streak_days=current_streak_days,
    total_transactions_all_time=total_transactions_all_time or 0,

    budget_alerts=budget_alerts,
    ai_summary="Your financial dashboard is ready.",
)
