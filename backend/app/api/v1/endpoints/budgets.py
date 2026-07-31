import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.budget import Budget
from app.models.expense import Expense
from app.models.user import User
from app.schemas.budget import BudgetCreate, BudgetOut, BudgetUpdate
from app.utils.currency import amount_in_uzs

router = APIRouter(prefix="/budgets", tags=["Budgets"])


def _with_progress(db: Session, budget: Budget) -> BudgetOut:
    month_start = date.today().replace(day=1)
    stmt = select(func.coalesce(func.sum(amount_in_uzs(Expense, Expense.amount)), 0)).where(
        Expense.user_id == budget.user_id, Expense.expense_date >= month_start
    )
    if budget.category_id:
        stmt = stmt.where(Expense.category_id == budget.category_id)
    spent = db.scalar(stmt) or 0

    out = BudgetOut.model_validate(budget)
    out.spent_amount = float(spent)
    out.progress_percent = round(min(float(spent) / float(budget.limit_amount) * 100, 999), 2) if budget.limit_amount else 0
    return out


@router.get("", response_model=list[BudgetOut])
def list_budgets(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    budgets = db.scalars(select(Budget).where(Budget.user_id == current_user.id)).all()
    return [_with_progress(db, b) for b in budgets]


@router.post("", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
def create_budget(
    payload: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budget = Budget(user_id=current_user.id, **payload.model_dump())
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return _with_progress(db, budget)


def _get_owned_budget(db: Session, budget_id: uuid.UUID, user_id: uuid.UUID) -> Budget:
    budget = db.get(Budget, budget_id)
    if not budget or budget.user_id != user_id:
        raise HTTPException(status_code=404, detail="Budget not found")
    return budget


@router.patch("/{budget_id}", response_model=BudgetOut)
def update_budget(
    budget_id: uuid.UUID,
    payload: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budget = _get_owned_budget(db, budget_id, current_user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(budget, field, value)
    db.commit()
    db.refresh(budget)
    return _with_progress(db, budget)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budget = _get_owned_budget(db, budget_id, current_user.id)
    db.delete(budget)
    db.commit()
    return None
