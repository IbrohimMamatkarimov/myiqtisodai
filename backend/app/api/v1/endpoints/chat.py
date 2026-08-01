from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.chat_message import ChatMessage
from app.models.user import User
from app.schemas.chat import ChatMessageCreate, ChatMessageOut, ChatUnreadCount

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.get("/messages", response_model=list[ChatMessageOut])
def list_my_messages(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """The user's own conversation with support (all admins share one
    inbox per user, so this is simply every message tied to this user_id)."""
    messages = db.scalars(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at.asc())
    ).all()

    # Viewing the thread marks any admin replies as read.
    db.execute(
        update(ChatMessage)
        .where(
            ChatMessage.user_id == current_user.id,
            ChatMessage.sender_is_admin.is_(True),
            ChatMessage.is_read_by_user.is_(False),
        )
        .values(is_read_by_user=True)
    )
    db.commit()

    return messages


@router.get("/unread-count", response_model=ChatUnreadCount)
def my_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = db.scalar(
        select(func.count())
        .select_from(ChatMessage)
        .where(
            ChatMessage.user_id == current_user.id,
            ChatMessage.sender_is_admin.is_(True),
            ChatMessage.is_read_by_user.is_(False),
        )
    )
    return ChatUnreadCount(unread_count=count or 0)


@router.post("/messages", response_model=ChatMessageOut, status_code=status.HTTP_201_CREATED)
def send_message(
    payload: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    message = ChatMessage(
        user_id=current_user.id,
        sender_id=current_user.id,
        sender_is_admin=False,
        body=payload.body,
        is_read_by_user=True,
        is_read_by_admin=False,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
