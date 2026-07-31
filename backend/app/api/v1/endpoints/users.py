from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.budget import Budget, BudgetPeriod
from app.models.user import User
from app.schemas.user import CompleteOnboarding, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    update_data = payload.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)

    return current_user


# -------------------------------
# Finish onboarding
# -------------------------------
@router.post("/complete-onboarding", response_model=UserOut)
def complete_onboarding(
    payload: CompleteOnboarding,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    update_data = payload.model_dump(exclude_unset=True, exclude={"monthly_budget"})

    for field, value in update_data.items():
        setattr(current_user, field, value)

    current_user.onboarding_completed = True

    # Screen 4's "monthly budget" is the user's overall spending limit, which
    # lives in the Budget table (category_id=None means "overall", not
    # tied to one category) so it can feed the Phase 2 dashboard directly.
    if payload.monthly_budget is not None:
        overall_budget = db.scalar(
            select(Budget).where(
                Budget.user_id == current_user.id,
                Budget.category_id.is_(None),
                Budget.period == BudgetPeriod.monthly,
            )
        )

        if overall_budget is None:
            overall_budget = Budget(
                user_id=current_user.id,
                category_id=None,
                period=BudgetPeriod.monthly,
                limit_amount=payload.monthly_budget,
            )
            db.add(overall_budget)
        else:
            overall_budget.limit_amount = payload.monthly_budget

    db.commit()
    db.refresh(current_user)

    return current_user


# -------------------------------
# Delete account
# -------------------------------
@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.delete(current_user)
    db.commit()

    return None
