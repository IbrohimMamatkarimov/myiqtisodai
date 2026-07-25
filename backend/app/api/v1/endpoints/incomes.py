import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.income import Income
from app.models.user import User
from app.schemas.income import IncomeCreate, IncomeOut, IncomeUpdate

router = APIRouter(prefix="/incomes", tags=["Income"])


@router.get("", response_model=list[IncomeOut])
def list_incomes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    stmt = select(Income).where(Income.user_id == current_user.id)
    if start_date:
        stmt = stmt.where(Income.income_date >= start_date)
    if end_date:
        stmt = stmt.where(Income.income_date <= end_date)
    stmt = stmt.order_by(Income.income_date.desc())
    return db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all()


@router.post("", response_model=IncomeOut, status_code=status.HTTP_201_CREATED)
def create_income(
    payload: IncomeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    income = Income(user_id=current_user.id, **payload.model_dump())
    db.add(income)
    db.commit()
    db.refresh(income)
    return income


def _get_owned_income(db: Session, income_id: uuid.UUID, user_id: uuid.UUID) -> Income:
    income = db.get(Income, income_id)
    if not income or income.user_id != user_id:
        raise HTTPException(status_code=404, detail="Income not found")
    return income


@router.patch("/{income_id}", response_model=IncomeOut)
def update_income(
    income_id: uuid.UUID,
    payload: IncomeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    income = _get_owned_income(db, income_id, current_user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(income, field, value)
    db.commit()
    db.refresh(income)
    return income


@router.delete("/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_income(
    income_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    income = _get_owned_income(db, income_id, current_user.id)
    db.delete(income)
    db.commit()
    return None
