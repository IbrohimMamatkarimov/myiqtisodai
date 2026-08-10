import base64
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models.chat_message import ChatMessage
from app.models.expense import Expense
from app.models.goal import Goal
from app.models.goal_member import GoalMember, GoalMemberStatus
from app.models.goal_member_withdraw_confirmation import ConfirmationDecision, GoalMemberWithdrawConfirmation
from app.models.goal_member_withdraw_request import (
    GoalMemberWithdrawRequest,
    MemberWithdrawRequestStatus,
    MemberWithdrawRequestType,
)
from app.models.income import Income
from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.schemas.goal import (
    GoalAllocate,
    GoalCollectAllRequestCreate,
    GoalCreate,
    GoalInviteOut,
    GoalInviteRespond,
    GoalMemberInvite,
    GoalMemberOut,
    GoalMemberWithdrawRequestCreate,
    GoalMemberWithdrawRequestOut,
    GoalOut,
    GoalUnlockRequestCreate,
    GoalUnlockRequestOut,
    GoalUpdate,
    GoalWithdraw,
    WithdrawConfirmationDecide,
    WithdrawConfirmationOut,
)
from app.models.goal_unlock_request import GoalUnlockRequest, UnlockRequestStatus
from app.services.receipt_scanner import _downscale_image
from app.utils.currency import RATES_TO_UZS, amount_in_uzs

router = APIRouter(prefix="/goals", tags=["Goals"])

MAX_GOAL_IMAGE_SIZE = 6 * 1024 * 1024  # 6 MB
ALLOWED_GOAL_IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
}


@router.get("", response_model=list[GoalOut])
def list_goals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Includes goals they own AND group goals they've actually accepted an
    # invite to - pending invites live separately (GET /goals/invites) so
    # they don't show up here until the person explicitly accepts.
    owned = select(Goal.id).where(Goal.user_id == current_user.id)
    member_of = select(GoalMember.goal_id).where(
        GoalMember.user_id == current_user.id, GoalMember.status == GoalMemberStatus.accepted
    )
    # Active goals first (a completed one sitting behind an unbounded cap
    # elsewhere - like the dashboard's mini card row - shouldn't be able to
    # push a newly-joined active goal out of view), then most recently
    # created within each group.
    return db.scalars(
        select(Goal)
        .where(Goal.id.in_(owned) | Goal.id.in_(member_of))
        .order_by(Goal.is_completed.asc(), Goal.created_at.desc())
    ).all()


@router.get("/invites", response_model=list[GoalInviteOut])
def list_pending_invites(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Group-goal invites this user hasn't responded to yet."""
    rows = db.execute(
        select(GoalMember, Goal, User)
        .join(Goal, Goal.id == GoalMember.goal_id)
        .join(User, User.id == Goal.user_id)
        .where(GoalMember.user_id == current_user.id, GoalMember.status == GoalMemberStatus.pending)
    ).all()
    return [
        GoalInviteOut(
            id=member.id,
            goal_id=goal.id,
            goal_title=goal.title,
            owner_name=owner.full_name,
            created_at=member.created_at,
        )
        for member, goal, owner in rows
    ]


@router.post("/invites/{member_id}/respond", status_code=status.HTTP_200_OK)
def respond_to_invite(
    member_id: uuid.UUID,
    payload: GoalInviteRespond,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    member = db.get(GoalMember, member_id)
    if not member or member.user_id != current_user.id or member.status != GoalMemberStatus.pending:
        raise HTTPException(status_code=404, detail="Taklif topilmadi")

    goal = db.get(Goal, member.goal_id)

    if payload.accept:
        member.status = GoalMemberStatus.accepted
        db.add(
            Notification(
                user_id=goal.user_id,
                type=NotificationType.system,
                title="Taklif qabul qilindi",
                message=f"{current_user.full_name} «{goal.title}» maqsadiga qo'shildi.",
            )
        )
        db.commit()
        return {"message": "Taklif qabul qilindi"}
    else:
        db.add(
            Notification(
                user_id=goal.user_id,
                type=NotificationType.system,
                title="Taklif rad etildi",
                message=f"{current_user.full_name} «{goal.title}» maqsadiga taklifni rad etdi.",
            )
        )
        db.delete(member)
        db.commit()
        return {"message": "Taklif rad etildi"}


@router.post("", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(
    payload: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.is_group and (not payload.pin or len(payload.pin) < 4):
        raise HTTPException(status_code=400, detail="Oilaviy maqsad uchun PIN kod majburiy")

    data = payload.model_dump(exclude={"pin"})
    if data.get("is_group"):
        # A time-lock doesn't mean much for a group goal - withdrawing
        # always needs every member's confirmation plus an admin anyway,
        # so there's no separate self-serve unlock date to protect against.
        data["lock_days"] = None
    goal = Goal(user_id=current_user.id, **data)
    if payload.pin:
        # One shared PIN either way: for a personal goal it's what unlocks
        # a withdrawal later; for a group goal it's what every member
        # (owner included) types in to confirm someone else's withdrawal
        # request - see confirm_member_withdraw.
        goal.pin_hash = hash_password(payload.pin)
    # Deliberately no photo cover here (see stock_photos.py's docstring for
    # the full history) - even a moderated stock library can return an
    # off-topic or inappropriate photo for a short, non-English title, and
    # it happened again after this was re-enabled once already. The emoji
    # badge (frontend, keyword-matched) is the permanent, always-safe cover.
    db.add(goal)
    db.flush()
    if goal.is_group:
        # The creator is always a member too, at 0 contributed - so
        # "contribute" logic can treat owner and invited members exactly
        # the same way from here on.
        db.add(GoalMember(goal_id=goal.id, user_id=current_user.id, contributed_amount=0, status=GoalMemberStatus.accepted))
    db.commit()
    db.refresh(goal)
    return goal


def _get_owned_goal(db: Session, goal_id: uuid.UUID, user_id: uuid.UUID) -> Goal:
    goal = db.get(Goal, goal_id)
    if not goal or goal.user_id != user_id:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


def _get_member_goal(db: Session, goal_id: uuid.UUID, user_id: uuid.UUID) -> tuple[Goal, Optional[GoalMember]]:
    """For actions any member (not just the owner) of a group goal can do:
    contribute, view members, request their own withdrawal. Returns the goal
    plus that user's membership row (None for a non-group goal's owner)."""
    goal = db.get(Goal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if goal.user_id == user_id:
        member = db.scalar(select(GoalMember).where(GoalMember.goal_id == goal.id, GoalMember.user_id == user_id))
        return goal, member
    member = db.scalar(select(GoalMember).where(GoalMember.goal_id == goal.id, GoalMember.user_id == user_id))
    if not member:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal, member


@router.get("/{goal_id}/members", response_model=list[GoalMemberOut])
def list_goal_members(
    goal_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal, _ = _get_member_goal(db, goal_id, current_user.id)
    rows = db.execute(
        select(GoalMember, User).join(User, User.id == GoalMember.user_id).where(GoalMember.goal_id == goal.id)
    ).all()
    return [
        GoalMemberOut(
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            contributed_amount=float(member.contributed_amount),
            is_owner=(user.id == goal.user_id),
            status=member.status.value,
            has_confirm_pin=bool(member.confirm_pin_hash),
        )
        for member, user in rows
    ]


@router.post("/{goal_id}/members", response_model=GoalMemberOut, status_code=status.HTTP_201_CREATED)
def invite_goal_member(
    goal_id: uuid.UUID,
    payload: GoalMemberInvite,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Owner invites someone by their account email or phone number. Starts
    as a pending invite - the invited person has to explicitly accept
    (GET /goals/invites, POST /goals/invites/{id}/respond) before they're a
    real member with any access to contribute or view the shared goal."""
    goal = _get_owned_goal(db, goal_id, current_user.id)
    if not goal.is_group:
        raise HTTPException(status_code=400, detail="Bu oilaviy maqsad emas")

    identifier = payload.identifier.strip()
    invitee = db.scalar(select(User).where((User.email == identifier) | (User.phone == identifier)))
    if not invitee:
        raise HTTPException(status_code=404, detail="Bu email yoki telefon raqami bilan foydalanuvchi topilmadi")
    if invitee.id == current_user.id:
        raise HTTPException(status_code=400, detail="O'zingizni taklif qila olmaysiz")

    existing = db.scalar(
        select(GoalMember).where(GoalMember.goal_id == goal.id, GoalMember.user_id == invitee.id)
    )
    if existing:
        detail = (
            "Bu foydalanuvchi allaqachon a'zo"
            if existing.status == GoalMemberStatus.accepted
            else "Bu foydalanuvchiga taklif allaqachon yuborilgan"
        )
        raise HTTPException(status_code=400, detail=detail)

    member = GoalMember(goal_id=goal.id, user_id=invitee.id, contributed_amount=0, status=GoalMemberStatus.pending)
    db.add(member)

    db.add(
        Notification(
            user_id=invitee.id,
            type=NotificationType.system,
            title=f"\u00ab{goal.title}\u00bb oilaviy maqsadiga taklif",
            message=f"{current_user.full_name} sizni birgalikdagi jamg'arma maqsadiga taklif qildi. Qabul qilish yoki rad etish uchun Maqsadlar bo'limiga o'ting.",
            link="/goals",
        )
    )

    db.commit()
    return GoalMemberOut(
        user_id=invitee.id,
        full_name=invitee.full_name,
        email=invitee.email,
        contributed_amount=0,
        is_owner=False,
        status="pending",
    )


@router.delete("/{goal_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_goal_member(
    goal_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = _get_owned_goal(db, goal_id, current_user.id)
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Maqsad egasini olib tashlab bo'lmaydi")
    member = db.scalar(select(GoalMember).where(GoalMember.goal_id == goal.id, GoalMember.user_id == user_id))
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if float(member.contributed_amount) > 0:
        raise HTTPException(
            status_code=400,
            detail="Bu a'zoning ulushida mablag' bor. Avval uni yechib olishlari kerak.",
        )
    db.delete(member)
    db.commit()
    return None


@router.post("/{goal_id}/image", response_model=GoalOut)
async def upload_goal_image(
    goal_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Optional user-chosen cover photo for a goal - replaces the emoji badge
    once set. Stored downscaled as a base64 data URI in the same column
    (and the same pattern as receipt images), so no separate file storage or
    CDN is needed. Entirely optional - a goal with no photo just keeps
    showing its emoji badge."""
    goal = _get_owned_goal(db, goal_id, current_user.id)
    if file.content_type not in ALLOWED_GOAL_IMAGE_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Rasm JPEG, PNG, WEBP yoki HEIC formatida bo'lishi kerak.",
        )
    image_bytes = await file.read()
    if len(image_bytes) > MAX_GOAL_IMAGE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Rasm hajmi juda katta (max 6MB).")

    small_bytes, small_mime = _downscale_image(image_bytes, file.content_type)
    b64 = base64.b64encode(small_bytes).decode("utf-8")
    goal.image_url = f"data:{small_mime};base64,{b64}"
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}/image", response_model=GoalOut)
def remove_goal_image(
    goal_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = _get_owned_goal(db, goal_id, current_user.id)
    goal.image_url = None
    db.commit()
    db.refresh(goal)
    return goal


def _available_balance_uzs(db: Session, user_id: uuid.UUID) -> float:
    """All-time income minus all-time expenses, normalized to UZS. Already
    reflects any money currently locked into goals, since each allocation is
    itself stored as a real expense."""
    total_income = float(
        db.scalar(
            select(func.coalesce(func.sum(amount_in_uzs(Income, Income.amount)), 0)).where(
                Income.user_id == user_id
            )
        )
        or 0
    )
    total_expenses = float(
        db.scalar(
            select(func.coalesce(func.sum(amount_in_uzs(Expense, Expense.amount)), 0)).where(
                Expense.user_id == user_id
            )
        )
        or 0
    )
    return total_income - total_expenses


@router.patch("/{goal_id}", response_model=GoalOut)
def update_goal(
    goal_id: uuid.UUID,
    payload: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = _get_owned_goal(db, goal_id, current_user.id)
    update_data = payload.model_dump(exclude_unset=True)
    if goal.is_locked and "current_amount" in update_data:
        raise HTTPException(
            status_code=400,
            detail="Bu maqsad mablag'i qulflangan. Qo'shish uchun mablag' ajrating, yechish uchun PIN kiriting.",
        )
    for field, value in update_data.items():
        setattr(goal, field, value)
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
    # A goal with locked money must go through withdraw_funds first (PIN +
    # time-lock check). Without this, deleting was a silent backdoor around
    # both protections - the expense that moved the money out of the
    # balance stays forever, but the only record of where it went (and the
    # PIN needed to reclaim it) would vanish with the goal.
    if goal.is_locked:
        raise HTTPException(
            status_code=400,
            detail="Bu maqsadda mablag' bor. Avval uni yechib oling, keyin o'chiring.",
        )
    db.delete(goal)
    db.commit()
    return None


@router.post("/{goal_id}/forgot-pin", status_code=status.HTTP_200_OK)
def forgot_pin(
    goal_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """No self-serve PIN recovery on purpose - that PIN is the only thing
    standing between locked money and anyone who guesses it, so resetting
    it can't be automatic. Instead this drops a message into the user's
    support chat (already visible to admins) so an admin can verify who
    they're talking to before using the admin panel's Reset PIN tool."""
    goal = _get_owned_goal(db, goal_id, current_user.id)
    if goal.is_group:
        raise HTTPException(status_code=400, detail="Bu oilaviy maqsad emas")
    if not goal.pin_hash:
        raise HTTPException(status_code=400, detail="Bu maqsadda hali PIN kod o'rnatilmagan")

    message = ChatMessage(
        user_id=current_user.id,
        sender_id=current_user.id,
        sender_is_admin=False,
        body=f"\U0001f510 «{goal.title}» maqsadim uchun PIN kodimni unutdim. Yordam bera olasizmi?",
        is_read_by_user=True,
        is_read_by_admin=False,
    )
    db.add(message)
    db.commit()
    return {"message": "Yordam so'rovi yuborildi. Administrator tez orada javob beradi."}


@router.post("/{goal_id}/request-unlock", response_model=GoalUnlockRequestOut, status_code=status.HTTP_201_CREATED)
def request_early_unlock(
    goal_id: uuid.UUID,
    payload: GoalUnlockRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """User asks an admin to open a still-time-locked goal early. Shows up
    in the admin panel for approve/reject - approving clears the goal's
    time lock (they still need their PIN to actually withdraw)."""
    goal = _get_owned_goal(db, goal_id, current_user.id)
    if not goal.locked_until or datetime.now(timezone.utc) >= goal.locked_until:
        raise HTTPException(status_code=400, detail="Bu maqsad hozir qulflangan emas")

    existing = db.scalar(
        select(GoalUnlockRequest).where(
            GoalUnlockRequest.goal_id == goal.id,
            GoalUnlockRequest.status == UnlockRequestStatus.pending,
        )
    )
    if existing:
        return existing

    request = GoalUnlockRequest(
        user_id=current_user.id,
        goal_id=goal.id,
        goal_title=goal.title,
        reason=payload.reason,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


@router.post("/{goal_id}/allocate", response_model=GoalOut)
def allocate_funds(
    goal_id: uuid.UUID,
    payload: GoalAllocate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Moves money from the user's overall balance into this goal: creates a
    real expense (so balance/reports stay accurate) and locks the goal. For
    a personal goal, the PIN is captured the first time money is allocated
    and is required later to withdraw the funds back out. For a group goal,
    each contributor's own share is tracked separately (goal_members) and
    there's no PIN at all - withdrawing always goes through an admin."""
    goal, member = _get_member_goal(db, goal_id, current_user.id)
    if goal.is_completed:
        raise HTTPException(status_code=400, detail="Bu maqsad allaqachon yakunlangan")

    rate = RATES_TO_UZS.get(goal.currency, 1)
    amount_uzs = payload.amount * rate
    available_uzs = _available_balance_uzs(db, current_user.id)
    if amount_uzs > available_uzs + 0.01:
        raise HTTPException(status_code=400, detail="Balansingizda yetarli mablag' yo'q")

    if goal.is_group:
        if member is None or member.status != GoalMemberStatus.accepted:
            raise HTTPException(status_code=403, detail="Siz hali bu maqsadga taklifni qabul qilmagansiz")
        member.contributed_amount = float(member.contributed_amount) + payload.amount
    else:
        # Legacy goals created before PIN-at-creation existed have no
        # pin_hash yet - fall back to capturing it here on first allocation,
        # same as before. Any goal created after that change already has one.
        if not goal.pin_hash:
            if not payload.pin or len(payload.pin) < 4:
                raise HTTPException(status_code=400, detail="PIN kod kamida 4 ta belgidan iborat bo'lishi kerak")
            goal.pin_hash = hash_password(payload.pin)

    expense = Expense(
        user_id=current_user.id,
        amount=payload.amount,
        currency=goal.currency,
        description=f"Maqsad uchun ajratildi: {goal.title}",
        expense_date=date.today(),
        goal_id=goal.id,
        is_goal_transfer=True,
    )
    db.add(expense)

    goal.current_amount = float(goal.current_amount) + payload.amount
    goal.is_locked = True
    if goal.lock_days and not goal.locked_until:
        goal.locked_until = datetime.now(timezone.utc) + timedelta(days=goal.lock_days)
    if goal.current_amount >= goal.target_amount:
        goal.is_completed = True

    db.commit()
    db.refresh(goal)
    return goal


def _serialize_withdraw_request(db: Session, request: GoalMemberWithdrawRequest) -> GoalMemberWithdrawRequestOut:
    rows = db.execute(
        select(GoalMemberWithdrawConfirmation, User)
        .join(User, User.id == GoalMemberWithdrawConfirmation.user_id)
        .where(GoalMemberWithdrawConfirmation.request_id == request.id)
    ).all()
    confirmations = [
        WithdrawConfirmationOut(user_id=u.id, full_name=u.full_name, decision=c.decision.value) for c, u in rows
    ]
    all_confirmed = all(c.decision == ConfirmationDecision.approved for c, _ in rows)
    data = GoalMemberWithdrawRequestOut.model_validate(request).model_dump()
    data["confirmations"] = confirmations
    data["all_confirmed"] = all_confirmed
    data["request_type"] = request.request_type.value
    return GoalMemberWithdrawRequestOut(**data)


@router.get("/{goal_id}/withdraw-requests", response_model=list[GoalMemberWithdrawRequestOut])
def list_goal_withdraw_requests(
    goal_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Pending (and recent) withdrawal requests for a group goal, visible to
    any accepted member - so everyone can see what's waiting on their
    confirmation, not just the requester and the admin."""
    goal, member = _get_member_goal(db, goal_id, current_user.id)
    if not goal.is_group or member is None or member.status != GoalMemberStatus.accepted:
        raise HTTPException(status_code=400, detail="Bu oilaviy maqsad emas")
    requests = db.scalars(
        select(GoalMemberWithdrawRequest)
        .where(GoalMemberWithdrawRequest.goal_id == goal.id)
        .order_by(GoalMemberWithdrawRequest.created_at.desc())
        .limit(20)
    ).all()
    return [_serialize_withdraw_request(db, r) for r in requests]


@router.post("/withdraw-requests/{request_id}/confirm", response_model=GoalMemberWithdrawRequestOut)
def confirm_member_withdraw(
    request_id: uuid.UUID,
    payload: WithdrawConfirmationDecide,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Another group member signs off on (or declines) a withdrawal request.
    A single decline kills the request outright - it never even reaches an
    admin. Only once every other member has approved can an admin release
    the money.

    Approving either request type (own-share or collect-all) requires the
    goal's shared PIN - the one set when the group goal was created, same
    PIN every member uses. Declining never needs a PIN; saying no doesn't
    require proving who you are. Legacy group goals created before a shared
    PIN was required at creation have no pin_hash yet - the first person to
    confirm on one of those sets it for everyone from then on."""
    request = db.get(GoalMemberWithdrawRequest, request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    confirmation = db.scalar(
        select(GoalMemberWithdrawConfirmation).where(
            GoalMemberWithdrawConfirmation.request_id == request_id,
            GoalMemberWithdrawConfirmation.user_id == current_user.id,
        )
    )
    if not confirmation:
        raise HTTPException(status_code=403, detail="Sizdan bu so'rov uchun tasdiq so'ralmagan")
    if request.status != MemberWithdrawRequestStatus.pending or confirmation.decision != ConfirmationDecision.pending:
        raise HTTPException(status_code=400, detail="Bu so'rov allaqachon hal qilingan")

    if payload.approve:
        goal = db.get(Goal, request.goal_id)
        if not payload.pin or len(payload.pin) < 4:
            raise HTTPException(status_code=400, detail="PIN kod kamida 4 ta belgidan iborat bo'lishi kerak")
        if not goal.pin_hash:
            goal.pin_hash = hash_password(payload.pin)
        elif not verify_password(payload.pin, goal.pin_hash):
            raise HTTPException(status_code=400, detail="PIN noto'g'ri")

    confirmation.decision = ConfirmationDecision.approved if payload.approve else ConfirmationDecision.rejected

    if not payload.approve:
        request.status = MemberWithdrawRequestStatus.rejected
        request.admin_note = f"{current_user.full_name} rad etdi"
        db.add(
            Notification(
                user_id=request.user_id,
                type=NotificationType.system,
                title=f"'{request.goal_title}' so'rovingiz rad etildi",
                message=f"{current_user.full_name} so'rovingizni rad etdi.",
                link="/goals",
            )
        )
    else:
        # Leave status as 'pending' - the admin endpoint (approve_member_withdraw_request)
        # does its own live check of every confirmation before releasing funds,
        # and requires status=='pending' as a precondition. Flipping status here
        # would make that admin endpoint reject a fully-confirmed request as
        # "already decided". Just let the requester know all members are in.
        all_confirmations = db.scalars(
            select(GoalMemberWithdrawConfirmation).where(GoalMemberWithdrawConfirmation.request_id == request.id)
        ).all()
        if all(c.decision == ConfirmationDecision.approved for c in all_confirmations):
            db.add(
                Notification(
                    user_id=request.user_id,
                    type=NotificationType.system,
                    title=f"'{request.goal_title}' so'rovingiz tasdiqlandi",
                    message="Barcha a'zolar roziligini berdi. Endi administrator pulni yuborishini kutmoqda.",
                    link="/goals",
                )
            )

    db.commit()
    db.refresh(request)
    return _serialize_withdraw_request(db, request)


def _ensure_no_pending_withdraw_request(db: Session, goal_id: uuid.UUID) -> None:
    """Blocks a second withdrawal request (of either type) from being filed
    while one is still pending on the same goal - without this, an
    own-share request and a collect-all request could both be in flight at
    once and both get approved, double-counting the same money."""
    existing = db.scalar(
        select(GoalMemberWithdrawRequest).where(
            GoalMemberWithdrawRequest.goal_id == goal_id,
            GoalMemberWithdrawRequest.status == MemberWithdrawRequestStatus.pending,
        )
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Bu maqsad uchun allaqachon kutilayotgan so'rov bor. Avval uni hal qiling.",
        )


@router.post("/{goal_id}/request-member-withdraw", response_model=GoalMemberWithdrawRequestOut, status_code=status.HTTP_201_CREATED)
def request_member_withdraw(
    goal_id: uuid.UUID,
    payload: GoalMemberWithdrawRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """A group-goal member asking for their own contributed share back -
    never the whole pot, never someone else's share. Every OTHER accepted
    member has to confirm before an admin can even consider releasing the
    money; there's no self-serve PIN path for group goals at all."""
    goal, member = _get_member_goal(db, goal_id, current_user.id)
    if not goal.is_group or member is None:
        raise HTTPException(status_code=400, detail="Bu oilaviy maqsad emas")
    if member.status != GoalMemberStatus.accepted:
        raise HTTPException(status_code=403, detail="Siz hali bu maqsadga taklifni qabul qilmagansiz")
    if payload.amount > float(member.contributed_amount) + 0.01:
        raise HTTPException(status_code=400, detail="Bu summa sizning ulushingizdan ko'p")
    _ensure_no_pending_withdraw_request(db, goal.id)

    request = GoalMemberWithdrawRequest(
        goal_id=goal.id,
        user_id=current_user.id,
        goal_title=goal.title,
        amount=payload.amount,
        currency=goal.currency,
        reason=payload.reason,
        request_type=MemberWithdrawRequestType.own_share,
    )
    db.add(request)
    db.flush()

    other_members = db.scalars(
        select(GoalMember).where(
            GoalMember.goal_id == goal.id,
            GoalMember.status == GoalMemberStatus.accepted,
            GoalMember.user_id != current_user.id,
        )
    ).all()
    for other in other_members:
        db.add(GoalMemberWithdrawConfirmation(request_id=request.id, user_id=other.user_id))
        db.add(
            Notification(
                user_id=other.user_id,
                type=NotificationType.system,
                title=f"'{goal.title}' dan mablag' yechish so'rovi",
                message=f"{current_user.full_name} o'z ulushidan {payload.amount:,.0f} {goal.currency} yechib olishni so'ramoqda. Tasdiqlaysizmi?",
                link="/goals",
            )
        )

    db.commit()
    db.refresh(request)
    return _serialize_withdraw_request(db, request)


@router.post("/{goal_id}/request-collect-all", response_model=GoalMemberWithdrawRequestOut, status_code=status.HTTP_201_CREATED)
def request_collect_all(
    goal_id: uuid.UUID,
    payload: GoalCollectAllRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """A group-goal member asking to collect the ENTIRE box balance for
    themselves - not just what they personally put in. Same confirmation
    gate as an own-share request (every other accepted member, then an
    admin), except confirming this specific type requires each member's own
    PIN, not just a button tap - see confirm_member_withdraw."""
    goal, member = _get_member_goal(db, goal_id, current_user.id)
    if not goal.is_group or member is None:
        raise HTTPException(status_code=400, detail="Bu oilaviy maqsad emas")
    if member.status != GoalMemberStatus.accepted:
        raise HTTPException(status_code=403, detail="Siz hali bu maqsadga taklifni qabul qilmagansiz")
    if float(goal.current_amount) <= 0:
        raise HTTPException(status_code=400, detail="Bu qutida mablag' yo'q")
    _ensure_no_pending_withdraw_request(db, goal.id)

    request = GoalMemberWithdrawRequest(
        goal_id=goal.id,
        user_id=current_user.id,
        goal_title=goal.title,
        amount=float(goal.current_amount),
        currency=goal.currency,
        reason=payload.reason,
        request_type=MemberWithdrawRequestType.collect_all,
    )
    db.add(request)
    db.flush()

    other_members = db.scalars(
        select(GoalMember).where(
            GoalMember.goal_id == goal.id,
            GoalMember.status == GoalMemberStatus.accepted,
            GoalMember.user_id != current_user.id,
        )
    ).all()
    for other in other_members:
        db.add(GoalMemberWithdrawConfirmation(request_id=request.id, user_id=other.user_id))
        db.add(
            Notification(
                user_id=other.user_id,
                type=NotificationType.system,
                title=f"'{goal.title}' qutisini butunlay yig'ib olish so'rovi",
                message=f"{current_user.full_name} qutidagi barcha {request.amount:,.0f} {goal.currency} ni yig'ib olishni so'ramoqda. Tasdiqlash uchun PIN kodingiz kerak bo'ladi.",
                link="/goals",
            )
        )

    db.commit()
    db.refresh(request)
    return _serialize_withdraw_request(db, request)


@router.post("/{goal_id}/withdraw", response_model=GoalOut)
def withdraw_funds(
    goal_id: uuid.UUID,
    payload: GoalWithdraw,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Unlocks a goal and moves whatever is locked in it back to the user's
    overall balance as a real income entry - requires the PIN set when the
    goal was first locked. Not usable on a group goal - see
    request_member_withdraw for that."""
    goal = _get_owned_goal(db, goal_id, current_user.id)
    if goal.is_group:
        raise HTTPException(
            status_code=400,
            detail="Bu oilaviy maqsad. Faqat o'z ulushingizni so'rashingiz mumkin - admin tasdiqlashi kerak.",
        )
    if not goal.is_locked or not goal.pin_hash:
        raise HTTPException(status_code=400, detail="Bu maqsadda qulflangan mablag' yo'q")
    if goal.locked_until and datetime.now(timezone.utc) < goal.locked_until:
        days_left = max(1, (goal.locked_until - datetime.now(timezone.utc)).days + 1)
        raise HTTPException(
            status_code=400,
            detail=f"Bu mablag' hali qulflangan. Yechish uchun {days_left} kun qoldi.",
        )
    if not verify_password(payload.pin, goal.pin_hash):
        raise HTTPException(status_code=400, detail="PIN noto'g'ri")

    amount = float(goal.current_amount)
    if amount > 0:
        income = Income(
            user_id=current_user.id,
            source_name=f"Maqsaddan qaytarildi: {goal.title}",
            amount=amount,
            currency=goal.currency,
            income_date=date.today(),
            goal_id=goal.id,
            is_goal_transfer=True,
        )
        db.add(income)

    # A goal that had actually been completed and is now being cashed out is
    # done - keeping it around as an empty, unlocked, active-looking goal
    # was confusing ("why is my finished goal still here at 0%?"). Just
    # remove it; the deposit/withdrawal history lives on as real income and
    # expense rows either way.
    #
    # Everything the response needs is captured into plain locals BEFORE the
    # delete/commit below - reading ORM attributes off `goal` afterwards
    # raises (SQLAlchemy expires the instance on commit, and a deleted row
    # can't be re-fetched to satisfy that), and the response was also
    # missing the required `user_id` field. Both together meant this crashed
    # AFTER the withdrawal had already gone through - the money really did
    # move and the goal really was deleted, but the request came back as an
    # error, and retrying then hit a genuine 404 since the goal was already
    # gone.
    if goal.is_completed:
        response = GoalOut(
            id=goal.id,
            user_id=goal.user_id,
            title=goal.title,
            target_amount=goal.target_amount,
            current_amount=0,
            deadline=goal.deadline,
            icon=goal.icon,
            image_url=None,
            currency=goal.currency,
            is_completed=True,
            is_locked=False,
            has_pin=False,
            lock_days=None,
            locked_until=None,
            is_group=False,
            progress_percent=100,
        )
        db.delete(goal)
        db.commit()
        return response

    goal.current_amount = 0
    goal.is_locked = False
    goal.pin_hash = None
    goal.is_completed = False
    goal.locked_until = None

    db.commit()
    db.refresh(goal)
    return goal
