import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.debt import Debt, DebtDirection
from app.models.user import User
from app.schemas.debt import DebtCreate, DebtOut, DebtUpdate

router = APIRouter(prefix="/debts", tags=["Debts"])


@router.get("", response_model=list[DebtOut])
def list_debts(
    direction: DebtDirection | None = Query(None),
    is_paid: bool | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(Debt).where(Debt.user_id == current_user.id)
    if direction is not None:
        stmt = stmt.where(Debt.direction == direction)
    if is_paid is not None:
        stmt = stmt.where(Debt.is_paid == is_paid)
    stmt = stmt.order_by(Debt.is_paid.asc(), Debt.due_date.asc().nulls_last(), Debt.debt_date.desc())
    return db.scalars(stmt).all()


@router.post("", response_model=DebtOut, status_code=status.HTTP_201_CREATED)
def create_debt(
    payload: DebtCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    debt = Debt(user_id=current_user.id, **payload.model_dump())
    db.add(debt)
    db.commit()
    db.refresh(debt)
    return debt


def _get_owned_debt(db: Session, debt_id: uuid.UUID, user_id: uuid.UUID) -> Debt:
    debt = db.get(Debt, debt_id)
    if not debt or debt.user_id != user_id:
        raise HTTPException(status_code=404, detail="Debt not found")
    return debt


@router.patch("/{debt_id}", response_model=DebtOut)
def update_debt(
    debt_id: uuid.UUID,
    payload: DebtUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    debt = _get_owned_debt(db, debt_id, current_user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(debt, field, value)
    db.commit()
    db.refresh(debt)
    return debt


@router.delete("/{debt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_debt(
    debt_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    debt = _get_owned_debt(db, debt_id, current_user.id)
    db.delete(debt)
    db.commit()
    return None
