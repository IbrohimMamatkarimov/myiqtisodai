import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models.expense import Expense
from app.models.goal import Goal
from app.models.income import Income
from app.models.user import User
from app.schemas.goal import GoalAllocate, GoalCreate, GoalOut, GoalUpdate, GoalWithdraw
from app.services.stock_photos import get_goal_cover_photo
from app.utils.currency import RATES_TO_UZS, amount_in_uzs

router = APIRouter(prefix="/goals", tags=["Goals"])


@router.get("", response_model=list[GoalOut])
def list_goals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(select(Goal).where(Goal.user_id == current_user.id)).all()


@router.post("", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(
    payload: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = Goal(user_id=current_user.id, **payload.model_dump())
    # Best-effort cover photo from a moderated stock library - never blocks
    # saving the goal itself if the image service is unreachable.
    goal.image_url = get_goal_cover_photo(payload.title)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


def _get_owned_goal(db: Session, goal_id: uuid.UUID, user_id: uuid.UUID) -> Goal:
    goal = db.get(Goal, goal_id)
    if not goal or goal.user_id != user_id:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


def _available_balance_uzs(db: Session, user_id: uuid.UUID) -> float:
    """All-time income minus all-time expenses, normalized to UZS. Already
    reflects any money currently locked into goals, since each allocation is
    itself stored as a real expense."""
    total_income = float(
        db.scalar(
            select(func.coalesce(func.sum(amount_in_uzs(Income, Income.amount)), 0)).where(
                Income.user_id == user_id
            )
        )
        or 0
    )
    total_expenses = float(
        db.scalar(
            select(func.coalesce(func.sum(amount_in_uzs(Expense, Expense.amount)), 0)).where(
                Expense.user_id == user_id
            )
        )
        or 0
    )
    return total_income - total_expenses


@router.patch("/{goal_id}", response_model=GoalOut)
def update_goal(
    goal_id: uuid.UUID,
    payload: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = _get_owned_goal(db, goal_id, current_user.id)
    update_data = payload.model_dump(exclude_unset=True)
    if goal.is_locked and "current_amount" in update_data:
        raise HTTPException(
            status_code=400,
            detail="Bu maqsad mablag'i qulflangan. Qo'shish uchun mablag' ajrating, yechish uchun PIN kiriting.",
        )
    for field, value in update_data.items():
        setattr(goal, field, value)
    # Title changed - regenerate the cover image to match the new title.
    if "title" in update_data:
        goal.image_url = get_goal_cover_photo(goal.title)
    if goal.current_amount >= goal.target_amount:
        goal.is_completed = True
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = _get_owned_goal(db, goal_id, current_user.id)
    db.delete(goal)
    db.commit()
    return None


@router.post("/{goal_id}/allocate", response_model=GoalOut)
def allocate_funds(
    goal_id: uuid.UUID,
    payload: GoalAllocate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Moves money from the user's overall balance into this goal: creates a
    real expense (so balance/reports stay accurate) and locks the goal.
    The PIN is captured the first time money is allocated, and is required
    later to withdraw the funds back out."""
    goal = _get_owned_goal(db, goal_id, current_user.id)
    if goal.is_completed:
        raise HTTPException(status_code=400, detail="Bu maqsad allaqachon yakunlangan")

    rate = RATES_TO_UZS.get(goal.currency, 1)
    amount_uzs = payload.amount * rate
    available_uzs = _available_balance_uzs(db, current_user.id)
    if amount_uzs > available_uzs + 0.01:
        raise HTTPException(status_code=400, detail="Balansingizda yetarli mablag' yo'q")

    expense = Expense(
        user_id=current_user.id,
        amount=payload.amount,
        currency=goal.currency,
        description=f"Maqsad uchun ajratildi: {goal.title}",
        expense_date=date.today(),
        goal_id=goal.id,
        is_goal_transfer=True,
    )
    db.add(expense)

    goal.current_amount = float(goal.current_amount) + payload.amount
    if not goal.pin_hash:
        goal.pin_hash = hash_password(payload.pin)
    goal.is_locked = True
    if goal.current_amount >= goal.target_amount:
        goal.is_completed = True

    db.commit()
    db.refresh(goal)
    return goal


@router.post("/{goal_id}/withdraw", response_model=GoalOut)
def withdraw_funds(
    goal_id: uuid.UUID,
    payload: GoalWithdraw,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Unlocks a goal and moves whatever is locked in it back to the user's
    overall balance as a real income entry - requires the PIN set when the
    goal was first locked."""
    goal = _get_owned_goal(db, goal_id, current_user.id)
    if not goal.is_locked or not goal.pin_hash:
        raise HTTPException(status_code=400, detail="Bu maqsadda qulflangan mablag' yo'q")
    if not verify_password(payload.pin, goal.pin_hash):
        raise HTTPException(status_code=400, detail="PIN noto'g'ri")

    amount = float(goal.current_amount)
    if amount > 0:
        income = Income(
            user_id=current_user.id,
            source_name=f"Maqsaddan qaytarildi: {goal.title}",
            amount=amount,
            currency=goal.currency,
            income_date=date.today(),
            goal_id=goal.id,
            is_goal_transfer=True,
        )
        db.add(income)

    goal.current_amount = 0
    goal.is_locked = False
    goal.pin_hash = None
    goal.is_completed = False

    db.commit()
    db.refresh(goal)
    return goal
