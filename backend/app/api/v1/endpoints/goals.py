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
from app.models.goal_member import GoalMember
from app.models.goal_member_withdraw_request import GoalMemberWithdrawRequest
from app.models.income import Income
from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.schemas.goal import (
    GoalAllocate,
    GoalCreate,
    GoalMemberInvite,
    GoalMemberOut,
    GoalMemberWithdrawRequestCreate,
    GoalMemberWithdrawRequestOut,
    GoalOut,
    GoalUnlockRequestCreate,
    GoalUnlockRequestOut,
    GoalUpdate,
    GoalWithdraw,
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
    # Includes goals they own AND group goals someone else invited them to.
    owned = select(Goal.id).where(Goal.user_id == current_user.id)
    member_of = select(GoalMember.goal_id).where(GoalMember.user_id == current_user.id)
    return db.scalars(select(Goal).where(Goal.id.in_(owned) | Goal.id.in_(member_of))).all()


@router.post("", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(
    payload: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = payload.model_dump(exclude={"pin"})
    if data.get("is_group"):
        # Group goals never use the self-serve PIN - every withdrawal goes
        # through an admin instead, regardless of who's asking.
        data["lock_days"] = None
    goal = Goal(user_id=current_user.id, **data)
    if payload.pin and not goal.is_group:
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
        db.add(GoalMember(goal_id=goal.id, user_id=current_user.id, contributed_amount=0))
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
    """Owner invites someone by their account email or phone number. Adding
    them is immediate (no separate accept step) - they show up as a member
    right away, at 0 contributed until they add their own money."""
    goal = _get_owned_goal(db, goal_id, current_user.id)
    if not goal.is_group:
        raise HTTPException(status_code=400, detail="Bu oilaviy maqsad emas")

    identifier = payload.identifier.strip()
    invitee = db.scalar(select(User).where((User.email == identifier) | (User.phone == identifier)))
    if not invitee:
        raise HTTPException(status_code=404, detail="Bu email yoki telefon raqami bilan foydalanuvchi topilmadi")

    existing = db.scalar(
        select(GoalMember).where(GoalMember.goal_id == goal.id, GoalMember.user_id == invitee.id)
    )
    if existing:
        raise HTTPException(status_code=400, detail="Bu foydalanuvchi allaqachon a'zo")

    member = GoalMember(goal_id=goal.id, user_id=invitee.id, contributed_amount=0)
    db.add(member)

    db.add(
        Notification(
            user_id=invitee.id,
            type=NotificationType.system,
            title=f"Sizni \u00ab{goal.title}\u00bb oilaviy maqsadiga qo'shishdi",
            message=f"{current_user.full_name} sizni birgalikdagi jamg'arma maqsadiga taklif qildi.",
        )
    )

    db.commit()
    return GoalMemberOut(
        user_id=invitee.id,
        full_name=invitee.full_name,
        email=invitee.email,
        contributed_amount=0,
        is_owner=False,
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
        if member is None:
            raise HTTPException(status_code=404, detail="Goal not found")
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


@router.post("/{goal_id}/request-member-withdraw", response_model=GoalMemberWithdrawRequestOut, status_code=status.HTTP_201_CREATED)
def request_member_withdraw(
    goal_id: uuid.UUID,
    payload: GoalMemberWithdrawRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """A group-goal member asking for their own contributed share back -
    never the whole pot, never someone else's share. Always goes to an
    admin to actually move the money; there's no self-serve PIN path for
    group goals at all."""
    goal, member = _get_member_goal(db, goal_id, current_user.id)
    if not goal.is_group or member is None:
        raise HTTPException(status_code=400, detail="Bu oilaviy maqsad emas")
    if payload.amount > float(member.contributed_amount) + 0.01:
        raise HTTPException(status_code=400, detail="Bu summa sizning ulushingizdan ko'p")

    request = GoalMemberWithdrawRequest(
        goal_id=goal.id,
        user_id=current_user.id,
        goal_title=goal.title,
        amount=payload.amount,
        currency=goal.currency,
        reason=payload.reason,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


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
