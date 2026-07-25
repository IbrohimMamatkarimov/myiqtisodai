import math
import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.expense import Expense
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseOut, ExpenseUpdate, PaginatedExpenses

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.get("", response_model=PaginatedExpenses)
def list_expenses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Search in description"),
    category_id: Optional[uuid.UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    sort_by: str = Query("expense_date", pattern="^(expense_date|amount|created_at)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    stmt = select(Expense).where(Expense.user_id == current_user.id)

    if search:
        stmt = stmt.where(Expense.description.ilike(f"%{search}%"))
    if category_id:
        stmt = stmt.where(Expense.category_id == category_id)
    if start_date:
        stmt = stmt.where(Expense.expense_date >= start_date)
    if end_date:
        stmt = stmt.where(Expense.expense_date <= end_date)

    sort_col = getattr(Expense, sort_by)
    stmt = stmt.order_by(sort_col.desc() if sort_order == "desc" else sort_col.asc())

    total = len(db.scalars(stmt).all())
    items = db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all()

    return PaginatedExpenses(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(math.ceil(total / page_size), 1),
    )


@router.post("", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = Expense(user_id=current_user.id, **payload.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def _get_owned_expense(db: Session, expense_id: uuid.UUID, user_id: uuid.UUID) -> Expense:
    expense = db.get(Expense, expense_id)
    if not expense or expense.user_id != user_id:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


@router.get("/{expense_id}", response_model=ExpenseOut)
def get_expense(
    expense_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_owned_expense(db, expense_id, current_user.id)


@router.patch("/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: uuid.UUID,
    payload: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = _get_owned_expense(db, expense_id, current_user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = _get_owned_expense(db, expense_id, current_user.id)
    db.delete(expense)
    db.commit()
    return None
