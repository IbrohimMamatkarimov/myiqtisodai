import uuid

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.api.deps import get_current_superuser
from app.core.security import hash_password
from app.db.session import get_db
from app.models.chat_message import ChatMessage
from app.models.expense import Expense
from app.models.goal import Goal
from app.models.income import Income
from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.schemas.chat import ChatConversationOut, ChatMessageCreate, ChatMessageOut
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


# --------------------------------------------------------------------------
# Support chat - all admins share one inbox per user (like a typical
# single-inbox support tool), so any admin can pick up any conversation.
# --------------------------------------------------------------------------

@router.get("/chat/conversations", response_model=list[ChatConversationOut])
def list_conversations(
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    # Latest message per user, plus how many of that user's messages the
    # admin side hasn't read yet.
    latest_ids_subq = (
        select(
            ChatMessage.user_id,
            func.max(ChatMessage.created_at).label("max_created_at"),
        )
        .group_by(ChatMessage.user_id)
        .subquery()
    )

    latest_messages = db.execute(
        select(ChatMessage, User)
        .join(User, User.id == ChatMessage.user_id)
        .join(
            latest_ids_subq,
            (ChatMessage.user_id == latest_ids_subq.c.user_id)
            & (ChatMessage.created_at == latest_ids_subq.c.max_created_at),
        )
        .order_by(ChatMessage.created_at.desc())
    ).all()

    results = []
    for message, user in latest_messages:
        unread_count = db.scalar(
            select(func.count())
            .select_from(ChatMessage)
            .where(
                ChatMessage.user_id == user.id,
                ChatMessage.sender_is_admin.is_(False),
                ChatMessage.is_read_by_admin.is_(False),
            )
        )
        results.append(
            ChatConversationOut(
                user_id=user.id,
                email=user.email,
                full_name=user.full_name,
                last_message=message.body,
                last_message_at=message.created_at,
                last_sender_is_admin=message.sender_is_admin,
                unread_count=unread_count or 0,
            )
        )
    return results


@router.get("/chat/{user_id}/messages", response_model=list[ChatMessageOut])
def get_conversation(
    user_id: uuid.UUID,
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    messages = db.scalars(
        select(ChatMessage)
        .where(ChatMessage.user_id == user_id)
        .order_by(ChatMessage.created_at.asc())
    ).all()

    # Opening the thread marks the user's messages as read by an admin.
    db.execute(
        update(ChatMessage)
        .where(
            ChatMessage.user_id == user_id,
            ChatMessage.sender_is_admin.is_(False),
            ChatMessage.is_read_by_admin.is_(False),
        )
        .values(is_read_by_admin=True)
    )
    db.commit()

    return messages


@router.post("/chat/{user_id}/messages", response_model=ChatMessageOut, status_code=201)
def reply_to_conversation(
    user_id: uuid.UUID,
    payload: ChatMessageCreate,
    current_admin: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    message = ChatMessage(
        user_id=user_id,
        sender_id=current_admin.id,
        sender_is_admin=True,
        body=payload.body,
        is_read_by_admin=True,
        is_read_by_user=False,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
