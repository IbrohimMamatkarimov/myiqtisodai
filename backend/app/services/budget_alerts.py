"""Generates budget-alert notifications.

Hooked from expenses.create_expense: after an expense is saved, checks any
budget it could affect (a category-specific budget, plus any overall/no-category
budget) and raises a Notification the first time spending crosses the budget's
alert_threshold_percent, and again the first time it crosses 100%. Dedupes by
checking for an existing notification of the same type/title raised this month,
so it doesn't spam one notification per expense.
"""
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.budget import Budget
from app.models.expense import Expense
from app.models.notification import Notification, NotificationType


def _spent_this_period(db: Session, user_id, category_id) -> float:
    month_start = date.today().replace(day=1)
    stmt = select(Expense).where(Expense.user_id == user_id, Expense.expense_date >= month_start)
    if category_id:
        stmt = stmt.where(Expense.category_id == category_id)
    expenses = db.scalars(stmt).all()
    total = 0.0
    for e in expenses:
        rate = {"USD": 12700, "EUR": 13700}.get(e.currency, 1)
        total += float(e.amount) * rate
    return total


def check_budget_alerts(db: Session, user_id, category_id) -> None:
    stmt = select(Budget).where(Budget.user_id == user_id)
    stmt = stmt.where((Budget.category_id == category_id) | (Budget.category_id.is_(None)))
    budgets = db.scalars(stmt).all()

    for budget in budgets:
        if not budget.limit_amount:
            continue
        spent = _spent_this_period(db, user_id, budget.category_id)
        percent = spent / float(budget.limit_amount) * 100

        if percent >= 100:
            _raise_once(db, user_id, budget, NotificationType.overspending, percent)
        elif percent >= (budget.alert_threshold_percent or 80):
            _raise_once(db, user_id, budget, NotificationType.budget_alert, percent)


def _raise_once(db: Session, user_id, budget: Budget, ntype: NotificationType, percent: float) -> None:
    label = budget.category.name if budget.category_id and budget.category else "your overall budget"
    title = f"{'Budget exceeded' if ntype == NotificationType.overspending else 'Budget alert'}: {label}"

    month_start = date.today().replace(day=1)
    existing = db.scalars(
        select(Notification).where(
            Notification.user_id == user_id,
            Notification.type == ntype,
            Notification.title == title,
            Notification.created_at >= month_start,
        )
    ).first()
    if existing:
        return

    db.add(
        Notification(
            user_id=user_id,
            type=ntype,
            title=title,
            message=f"You've used {round(percent)}% of the {label} budget this month.",
        )
    )
    db.commit()
