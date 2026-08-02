import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.goal import Goal
from app.models.user import User
from app.schemas.goal import GoalCreate, GoalOut, GoalUpdate
from app.services.stock_photos import get_goal_cover_photo

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


@router.patch("/{goal_id}", response_model=GoalOut)
def update_goal(
    goal_id: uuid.UUID,
    payload: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = _get_owned_goal(db, goal_id, current_user.id)
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)
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
