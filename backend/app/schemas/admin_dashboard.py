from datetime import datetime
from typing import Optional
import uuid

from pydantic import BaseModel


class AdminDashboardStats(BaseModel):
    total_users: int
    active_users: int
    ai_chats_today: int
    total_expenses: float
    total_incomes: float
    reports_waiting: int
    pending_deletion_requests: int


class RecentActivityItem(BaseModel):
    type: str  # "new_user" | "chat_message" | "report"
    label: str
    detail: Optional[str] = None
    user_id: Optional[uuid.UUID] = None
    at: datetime
