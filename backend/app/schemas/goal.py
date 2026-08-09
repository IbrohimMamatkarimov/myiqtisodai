import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class GoalCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    target_amount: float = Field(gt=0)
    current_amount: float = Field(default=0, ge=0)
    deadline: Optional[date] = None
    icon: Optional[str] = None
    currency: str = Field(default="UZS", max_length=8)
    lock_days: Optional[int] = Field(default=None, ge=1, le=3650)
    is_group: bool = False
    # PIN is set once, at creation - required to later withdraw any money
    # locked into this goal. Optional in the schema for backward
    # compatibility with goals created before this existed (those still
    # fall back to being asked for a PIN on first allocation instead).
    # Group goals ignore this entirely - they never use a self-serve PIN,
    # every withdrawal goes through admin approval instead.
    pin: Optional[str] = Field(default=None, min_length=4, max_length=32)


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    target_amount: Optional[float] = Field(default=None, gt=0)
    current_amount: Optional[float] = Field(default=None, ge=0)
    deadline: Optional[date] = None
    icon: Optional[str] = None
    currency: Optional[str] = Field(default=None, max_length=8)
    is_completed: Optional[bool] = None


class GoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    target_amount: float
    current_amount: float
    deadline: Optional[date]
    icon: Optional[str]
    image_url: Optional[str] = None
    currency: str
    is_completed: bool
    is_locked: bool
    has_pin: bool = False
    lock_days: Optional[int] = None
    locked_until: Optional[datetime] = None
    is_group: bool = False
    progress_percent: float


class GoalMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    full_name: str
    email: str
    contributed_amount: float
    is_owner: bool = False
    status: str = "accepted"


class GoalInviteOut(BaseModel):
    """A pending invite from the invited person's own point of view - what
    goal, whose invite, so they can decide whether to accept it."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    goal_id: uuid.UUID
    goal_title: str
    owner_name: str
    created_at: datetime


class GoalMemberInvite(BaseModel):
    # Either the person's account email or their phone number, whichever
    # they registered with - matched against both.
    identifier: str = Field(min_length=3, max_length=255)


class GoalInviteRespond(BaseModel):
    accept: bool


class GoalAllocate(BaseModel):
    amount: float = Field(gt=0)
    # Only actually required for legacy goals that predate PIN-at-creation
    # (i.e. have no pin_hash yet) - the endpoint enforces that, not this
    # schema, since it depends on the goal's own state.
    pin: Optional[str] = Field(default=None, max_length=32)


class GoalWithdraw(BaseModel):
    pin: str = Field(min_length=4, max_length=32)


class GoalUnlockRequestCreate(BaseModel):
    reason: str = Field(min_length=2, max_length=1000)


class GoalUnlockRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    goal_id: uuid.UUID
    goal_title: str
    reason: str
    status: str
    admin_note: Optional[str] = None
    created_at: datetime


class AdminGoalUnlockRequestOut(GoalUnlockRequestOut):
    user_id: uuid.UUID
    user_email: str
    user_full_name: str
    # None once the goal has since been withdrawn/deleted - request stays
    # viewable in the admin panel either way via goal_title above.
    goal_still_locked: bool = False


class AdminUnlockDecision(BaseModel):
    note: Optional[str] = Field(default=None, max_length=1000)


class AdminResetGoalPin(BaseModel):
    # If omitted, the backend generates a random PIN and includes it in the
    # notification sent to the user - saves the admin from having to make
    # one up mid-chat.
    new_pin: Optional[str] = Field(default=None, min_length=4, max_length=32)


class GoalMemberWithdrawRequestCreate(BaseModel):
    amount: float = Field(gt=0)
    reason: str = Field(min_length=2, max_length=1000)


class GoalMemberWithdrawRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    goal_id: uuid.UUID
    goal_title: str
    amount: float
    currency: str
    reason: str
    status: str
    admin_note: Optional[str] = None
    created_at: datetime


class AdminGoalMemberWithdrawRequestOut(GoalMemberWithdrawRequestOut):
    user_id: uuid.UUID
    user_email: str
    user_full_name: str
