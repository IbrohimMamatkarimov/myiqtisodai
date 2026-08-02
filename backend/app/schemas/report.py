from datetime import datetime
from typing import Optional
import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.models.report import ReportStatus


class ReportCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=4000)


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    subject: str
    message: str
    status: ReportStatus
    admin_reply: Optional[str]
    created_at: datetime


class AdminReportOut(ReportOut):
    user_id: uuid.UUID
    user_email: str
    user_full_name: str


class AdminReportReply(BaseModel):
    reply: str = Field(min_length=1, max_length=4000)
