import uuid

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_superuser
from app.core.security import hash_password
from app.db.session import get_db
from app.models.expense import Expense
from app.models.goal import Goal
from app.models.income import Income
from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.schemas.user import (
    AdminDeletionDecision,
    AdminNotifyUser,
    AdminSetPassword,
    AdminUserDetail,
    AdminUserOut,
    DeletionRequestOut,
    UserOut,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/deletion-requests", response_model=list[DeletionRequestOut])
def list_deletion_requests(
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    return db.scalars(select(User).where(User.deletion_requested.is_(True))).all()


@router.post("/deletion-requests/{user_id}/approve", status_code=204)
def approve_deletion_request(
    user_id: uuid.UUID,
    payload: AdminDeletionDecision = Body(default=AdminDeletionDecision()),
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target or not target.deletion_requested:
        raise HTTPException(status_code=404, detail="No pending deletion request for that user.")

    db.delete(target)
    db.commit()
    return None


@router.post("/deletion-requests/{user_id}/reject", response_model=UserOut)
def reject_deletion_request(
    user_id: uuid.UUID,
    payload: AdminDeletionDecision = Body(default=AdminDeletionDecision()),
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target or not target.deletion_requested:
        raise HTTPException(status_code=404, detail="No pending deletion request for that user.")

    target.deletion_requested = False
    target.deletion_reason = None
    target.deletion_requested_at = None

    db.add(
        Notification(
            user_id=target.id,
            type=NotificationType.system,
            title="Your account deletion request was declined",
            message=payload.message or "An admin reviewed your request and decided not to delete your account. Contact support if you have questions.",
        )
    )

    db.commit()
    db.refresh(target)
    return target


# --------------------------------------------------------------------------
# General user management
# --------------------------------------------------------------------------

@router.get("/users", response_model=list[AdminUserOut])
def list_users(
    search: str | None = Query(None, description="Search by email or full name"),
    current_admin: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    stmt = select(User).order_by(User.created_at.desc())
    if search:
        like = f"%{search}%"
        stmt = stmt.where((User.email.ilike(like)) | (User.full_name.ilike(like)))
    return db.scalars(stmt).all()


@router.get("/users/{user_id}", response_model=AdminUserDetail)
def get_user_detail(
    user_id: uuid.UUID,
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    total_expenses = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(Expense.user_id == user_id)
    )
    total_income = db.scalar(
        select(func.coalesce(func.sum(Income.amount), 0)).where(Income.user_id == user_id)
    )
    expense_count = db.scalar(select(func.count()).select_from(Expense).where(Expense.user_id == user_id))
    income_count = db.scalar(select(func.count()).select_from(Income).where(Income.user_id == user_id))
    goal_count = db.scalar(select(func.count()).select_from(Goal).where(Goal.user_id == user_id))

    return AdminUserDetail(
        **AdminUserOut.model_validate(target).model_dump(),
        total_income=float(total_income or 0),
        total_expenses=float(total_expenses or 0),
        expense_count=expense_count or 0,
        income_count=income_count or 0,
        goal_count=goal_count or 0,
    )


@router.post("/users/{user_id}/toggle-active", response_model=AdminUserOut)
def toggle_user_active(
    user_id: uuid.UUID,
    current_admin: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_admin.id:
        raise HTTPException(status_code=400, detail="You can't deactivate your own admin account.")

    target.is_active = not target.is_active
    db.commit()
    db.refresh(target)
    return target


@router.post("/users/{user_id}/reset-password", status_code=204)
def admin_set_password(
    user_id: uuid.UUID,
    payload: AdminSetPassword,
    current_admin: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    """Force-sets a new password for a user. Use this instead of relying on
    the email-based reset flow when SMTP isn't configured - relay the new
    password to the user through whatever channel you contacted them on."""
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target.hashed_password = hash_password(payload.new_password)
    db.commit()
    return None


@router.delete("/users/{user_id}", status_code=204)
def admin_delete_user(
    user_id: uuid.UUID,
    current_admin: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_admin.id:
        raise HTTPException(status_code=400, detail="You can't delete your own admin account.")

    db.delete(target)
    db.commit()
    return None


@router.post("/users/{user_id}/notify", status_code=204)
def notify_user(
    user_id: uuid.UUID,
    payload: AdminNotifyUser,
    current_admin: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    """Send a one-off message to a user - lands in their notification bell.
    Use this to contact a user directly, e.g. asking why they want to
    delete their account, or following up on any other admin matter."""
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    db.add(
        Notification(
            user_id=target.id,
            type=NotificationType.system,
            title=payload.title,
            message=payload.message,
        )
    )
    db.commit()
    return None
