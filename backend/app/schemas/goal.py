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
    # PIN is set once, at creation - required either way. For a personal
    # goal, it's needed later to withdraw. For a group goal, the creator is
    # auto-added as a member (see create_goal), so this becomes THEIR OWN
    # confirm PIN - the same one every other invited member sets for
    # themselves when they accept (GoalInviteRespond.pin) - not a single
    # shared PIN anymore. Optional in the schema only for backward
    # compatibility with personal goals created before this existed (those
    # fall back to being asked for a PIN on first allocation instead) - the
    # endpoint itself requires it for every new group goal.
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
    # Whether this member has already set their collect-all confirmation PIN
    # - lets the frontend show "first time" hint text only when it's true.
    has_confirm_pin: bool = False


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


class GoalMemberSetConfirmPin(BaseModel):
    # Self-service: the member sets this themselves, no old PIN required (if
    # they knew the old one they wouldn't need this). Authenticated purely
    # by already being logged into their own account - same trust level as
    # everything else a member can do on a goal they belong to. The actual
    # money-safety here comes from every OTHER member also having to type
    # their own PIN, not from this one being hard to reset.
    pin: str = Field(min_length=4, max_length=32)


class GoalInviteRespond(BaseModel):
    accept: bool
    # Required when accept=True: the PIN this member is setting for
    # themselves, right now, as a condition of joining the box - not
    # optional, not captured later. This is THEIR OWN PIN (GoalMember.
    # confirm_pin_hash), used only by them whenever they're asked to
    # confirm someone else's withdrawal request on this goal. Not required
    # when declining.
    pin: Optional[str] = Field(default=None, min_length=4, max_length=32)


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
    # No longer required - a member shouldn't have to justify wanting their
    # own money back. Still accepted and still shown if they choose to add
    # one (and still required to look back at on older requests made before
    # this changed - those keep whatever reason was given at the time).
    reason: Optional[str] = Field(default=None, max_length=1000)


class GoalCollectAllRequestCreate(BaseModel):
    # No amount field - it's always the goal's entire current balance,
    # snapshotted server-side at request time, never something the
    # requester types in themselves.
    reason: Optional[str] = Field(default=None, max_length=1000)


class WithdrawConfirmationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    full_name: str
    decision: str


class WithdrawConfirmationDecide(BaseModel):
    approve: bool
    # Required whenever approve=True, for either request type - THIS
    # member's own PIN, the one they set for themselves when they joined
    # the box (or, for the owner, when they created it). Never a shared
    # PIN. Not required when declining.
    pin: Optional[str] = Field(default=None, min_length=4, max_length=32)


class GoalMemberWithdrawRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    goal_id: uuid.UUID
    goal_title: str
    amount: float
    currency: str
    reason: Optional[str] = None
    status: str
    admin_note: Optional[str] = None
    created_at: datetime
    confirmations: list[WithdrawConfirmationOut] = []
    # Whether the goal's other members have all signed off yet - an admin
    # can't release the money until this is true.
    all_confirmed: bool = True
    request_type: str = "own_share"


class AdminGoalMemberWithdrawRequestOut(GoalMemberWithdrawRequestOut):
    user_id: uuid.UUID
    user_email: str
    user_full_name: str


class GoalMessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class GoalMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    body: str
    created_at: datetime
