from datetime import datetime
from typing import Optional
import uuid

from pydantic import BaseModel, ConfigDict, Field


class ChatMessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sender_id: uuid.UUID
    sender_is_admin: bool
    body: str
    created_at: datetime


class ChatUnreadCount(BaseModel):
    unread_count: int


class ChatConversationOut(BaseModel):
    """One row in the admin's conversation list - one per user who has ever
    chatted, with a preview of the last message and how many of the user's
    messages haven't been read by an admin yet."""

    user_id: uuid.UUID
    email: str
    full_name: str
    last_message: str
    last_message_at: datetime
    last_sender_is_admin: bool
    unread_count: int
