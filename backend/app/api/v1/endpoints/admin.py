import secrets
import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.api.deps import get_current_superuser
from app.core.security import hash_password
from app.db.session import get_db
from app.models.ai_conversation import AIConversation
from app.models.chat_message import ChatMessage
from app.models.expense import Expense
from app.models.goal import Goal
from app.models.goal_unlock_request import GoalUnlockRequest, UnlockRequestStatus
from app.models.goal_member import GoalMember, GoalMemberStatus
from app.models.goal_member_withdraw_confirmation import ConfirmationDecision, GoalMemberWithdrawConfirmation
from app.models.goal_member_withdraw_request import (
    GoalMemberWithdrawRequest,
    MemberWithdrawRequestStatus,
    MemberWithdrawRequestType,
)
from app.models.income import Income
from app.models.notification import Notification, NotificationType
from app.models.report import Report, ReportStatus
from app.models.user import User
from app.schemas.chat import ChatConversationOut, ChatMessageCreate, ChatMessageOut
from app.schemas.goal import (
    AdminGoalMemberWithdrawRequestOut,
    AdminGoalUnlockRequestOut,
    AdminResetGoalPin,
    AdminUnlockDecision,
    GoalMemberOut,
    GoalMemberWithdrawRequestOut,
    GoalOut,
    GoalUnlockRequestOut,
)
from app.schemas.report import AdminReportOut, AdminReportReply, ReportOut
from app.schemas.user import (
    AdminChangeEmail,
    AdminDashboardStats,
    AdminDeletionDecision,
    AdminNotifyUser,
    AdminSetPassword,
    AdminUserDetail,
    AdminUserOut,
    AdminUserUpdate,
    BroadcastNotification,
    DeletionRequestOut,
    UserOut,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


# --------------------------------------------------------------------------
# Dashboard
# --------------------------------------------------------------------------

@router.get("/dashboard", response_model=AdminDashboardStats)
def dashboard_stats(
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)

    total_users = db.scalar(select(func.count()).select_from(User)) or 0
    active_users = db.scalar(select(func.count()).select_from(User).where(User.is_active.is_(True))) or 0
    ai_chats_today = (
        db.scalar(
            select(func.count()).select_from(AIConversation).where(AIConversation.created_at >= today_start)
        )
        or 0
    )
    total_expenses = db.scalar(select(func.coalesce(func.sum(Expense.amount), 0))) or 0
    total_incomes = db.scalar(select(func.coalesce(func.sum(Income.amount), 0))) or 0
    reports_waiting = (
        db.scalar(select(func.count()).select_from(Report).where(Report.status == ReportStatus.open)) or 0
    )

    recent_users = db.scalars(select(User).order_by(User.created_at.desc()).limit(8)).all()
    recent_activity = [
        {
            "kind": "new_user",
            "label": f"{u.full_name or u.email} joined",
            "at": u.created_at,
        }
        for u in recent_users
    ]
    recent_activity.sort(key=lambda x: x["at"], reverse=True)

    return AdminDashboardStats(
        total_users=total_users,
        active_users=active_users,
        ai_chats_today=ai_chats_today,
        total_expenses=float(total_expenses),
        total_incomes=float(total_incomes),
        reports_waiting=reports_waiting,
        recent_activity=recent_activity[:10],
    )


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


@router.patch("/users/{user_id}", response_model=AdminUserOut)
def admin_update_user(
    user_id: uuid.UUID,
    payload: AdminUserUpdate,
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    """Admin directly editing a user's profile fields (name, phone, country,
    occupation, age, gender, income, salary day, financial goal)."""
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(target, field, value)

    db.commit()
    db.refresh(target)
    return target


@router.post("/users/{user_id}/change-email", response_model=AdminUserOut)
def admin_change_email(
    user_id: uuid.UUID,
    payload: AdminChangeEmail,
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.scalar(select(User).where(User.email == payload.new_email, User.id != user_id))
    if existing:
        raise HTTPException(status_code=400, detail="That email is already in use by another account.")

    target.email = payload.new_email
    db.commit()
    db.refresh(target)
    return target


@router.post("/users/{user_id}/reset-onboarding", response_model=AdminUserOut)
def admin_reset_onboarding(
    user_id: uuid.UUID,
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    """Sends the user back through the onboarding wizard on next login,
    without touching any of their existing financial data."""
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target.onboarding_completed = False
    db.commit()
    db.refresh(target)
    return target


@router.post("/notify-all", status_code=204)
def notify_all_users(
    payload: BroadcastNotification,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    """Sends the same notification to every active user at once."""
    user_ids = db.scalars(select(User.id).where(User.is_active.is_(True))).all()
    db.bulk_save_objects(
        [
            Notification(
                user_id=uid,
                type=NotificationType.system,
                title=payload.title,
                message=payload.message,
            )
            for uid in user_ids
        ]
    )
    db.commit()
    return None


# --------------------------------------------------------------------------
# Goal early-unlock requests
# --------------------------------------------------------------------------

@router.get("/users/{user_id}/goals", response_model=list[GoalOut])
def list_user_goals(
    user_id: uuid.UUID,
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    """All of a specific user's goals, for the admin unlock tool - lets an
    admin browse straight to any goal (locked or not) rather than only
    ones with an explicit pending unlock request."""
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    return db.scalars(select(Goal).where(Goal.user_id == user_id).order_by(Goal.created_at.desc())).all()


@router.post("/goals/{goal_id}/unlock", response_model=GoalOut)
def admin_unlock_goal(
    goal_id: uuid.UUID,
    payload: AdminUnlockDecision = Body(default=AdminUnlockDecision()),
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    """Directly clears a goal's time lock - same effect as approving an
    unlock request, but usable on any locked goal even without one (the
    admin found it by browsing the user's goals, not from the request
    queue). The PIN is still required client-side to actually withdraw -
    this only lifts the time lock, it never bypasses the PIN."""
    goal = db.get(Goal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if not goal.is_locked:
        raise HTTPException(status_code=400, detail="This goal isn't locked.")

    goal.locked_until = None

    # If there's a pending request for this exact goal, resolve it too so it
    # doesn't linger in the queue looking unactioned.
    pending = db.scalar(
        select(GoalUnlockRequest).where(
            GoalUnlockRequest.goal_id == goal.id,
            GoalUnlockRequest.status == UnlockRequestStatus.pending,
        )
    )
    if pending:
        pending.status = UnlockRequestStatus.approved
        pending.admin_note = payload.note

    db.add(
        Notification(
            user_id=goal.user_id,
            type=NotificationType.system,
            title=f"'{goal.title}' erta ochildi",
            message=payload.note or "Endi PIN kodingiz bilan mablag'ni yechib olishingiz mumkin.",
            link="/goals",
        )
    )

    db.commit()
    db.refresh(goal)
    return goal


@router.post("/goals/{goal_id}/reset-pin", response_model=GoalOut)
def admin_reset_goal_pin(
    goal_id: uuid.UUID,
    payload: AdminResetGoalPin = Body(default=AdminResetGoalPin()),
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    """Sets a new PIN for a goal - this is the tool forgot_pin's support
    chat message points admins to, after they've verified who they're
    talking to. If no PIN is given, generates a random one and sends it to
    the user via notification, so the admin never has to see or choose the
    actual PIN themselves."""
    goal = db.get(Goal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if goal.is_group:
        raise HTTPException(status_code=400, detail="Group goals don't use a PIN.")

    new_pin = payload.new_pin or secrets.token_hex(3)  # e.g. "a1b2c3" if auto-generated
    goal.pin_hash = hash_password(new_pin)

    db.add(
        Notification(
            user_id=goal.user_id,
            type=NotificationType.system,
            title=f"'{goal.title}' uchun yangi PIN kod o'rnatildi",
            message=f"Yangi PIN kodingiz: {new_pin}\n\nBu kodni xavfsiz joyda saqlang - keyingi safar mablag'ni yechib olish uchun kerak bo'ladi.",
            link="/goals",
        )
    )

    db.commit()
    db.refresh(goal)
    return goal


@router.get("/goals/{goal_id}/members", response_model=list[GoalMemberOut])
def admin_list_goal_members(
    goal_id: uuid.UUID,
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    """So the admin panel's reset-member-PIN tool can show who's actually
    on a group goal, rather than requiring the admin to already know the
    exact user id from the support chat."""
    goal = db.get(Goal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
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


@router.post("/goals/{goal_id}/members/{user_id}/reset-confirm-pin", status_code=204)
def admin_reset_member_confirm_pin(
    goal_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: AdminResetGoalPin = Body(default=AdminResetGoalPin()),
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    """Resets ONE member's own confirm PIN (GoalMember.confirm_pin_hash) -
    the PIN they personally set when joining the box, used to sign off on
    other members' withdrawal requests. Never touches anyone else's PIN.
    Members can already self-serve this via set_my_confirm_pin without any
    admin involved - this exists as the admin-mediated fallback for anyone
    who'd rather go through support. If no PIN is given, generates a random
    one, so the admin never has to see or choose the actual PIN themselves."""
    goal = db.get(Goal, goal_id)
    if not goal or not goal.is_group:
        raise HTTPException(status_code=400, detail="Not a group goal.")
    member = db.scalar(select(GoalMember).where(GoalMember.goal_id == goal_id, GoalMember.user_id == user_id))
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    new_pin = payload.new_pin or secrets.token_hex(3)  # e.g. "a1b2c3" if auto-generated
    member.confirm_pin_hash = hash_password(new_pin)

    db.add(
        Notification(
            user_id=member.user_id,
            type=NotificationType.system,
            title=f"'{goal.title}' qutisi uchun yangi PIN kod o'rnatildi",
            message=f"Yangi shaxsiy PIN kodingiz: {new_pin}\n\nBu kodni xavfsiz joyda saqlang - boshqa a'zolarning yechish so'rovlarini tasdiqlash uchun keyingi safar shu kod kerak bo'ladi.",
            link="/goals",
        )
    )

    db.commit()
    return None


@router.get("/unlock-requests", response_model=list[AdminGoalUnlockRequestOut])
def list_unlock_requests(
    status_filter: UnlockRequestStatus | None = Query(None, alias="status"),
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    stmt = (
        select(GoalUnlockRequest, User)
        .join(User, User.id == GoalUnlockRequest.user_id)
        .order_by(GoalUnlockRequest.created_at.desc())
    )
    if status_filter:
        stmt = stmt.where(GoalUnlockRequest.status == status_filter)
    else:
        # Default view is what admins actually need to act on.
        stmt = stmt.where(GoalUnlockRequest.status == UnlockRequestStatus.pending)

    rows = db.execute(stmt).all()
    results = []
    for req, user in rows:
        goal = db.get(Goal, req.goal_id)
        results.append(
            AdminGoalUnlockRequestOut(
                **GoalUnlockRequestOut.model_validate(req).model_dump(),
                user_id=user.id,
                user_email=user.email,
                user_full_name=user.full_name,
                goal_still_locked=bool(goal and goal.is_locked),
            )
        )
    return results


@router.post("/unlock-requests/{request_id}/approve", response_model=AdminGoalUnlockRequestOut)
def approve_unlock_request(
    request_id: uuid.UUID,
    payload: AdminUnlockDecision = Body(default=AdminUnlockDecision()),
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    req = db.get(GoalUnlockRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Unlock request not found")
    if req.status != UnlockRequestStatus.pending:
        raise HTTPException(status_code=400, detail="This request has already been decided.")

    goal = db.get(Goal, req.goal_id)
    if goal:
        # Clears the time lock only - the PIN is still required to actually
        # withdraw, so approving this can't bypass that second protection.
        goal.locked_until = None

    req.status = UnlockRequestStatus.approved
    req.admin_note = payload.note

    db.add(
        Notification(
            user_id=req.user_id,
            type=NotificationType.system,
            title=f"'{req.goal_title}' erta ochish so'rovi tasdiqlandi",
            message=payload.note or "Endi PIN kodingiz bilan mablag'ni yechib olishingiz mumkin.",
        )
    )

    db.commit()
    db.refresh(req)
    user = db.get(User, req.user_id)
    return AdminGoalUnlockRequestOut(
        **GoalUnlockRequestOut.model_validate(req).model_dump(),
        user_id=user.id,
        user_email=user.email,
        user_full_name=user.full_name,
        goal_still_locked=bool(goal and goal.is_locked),
    )


@router.post("/unlock-requests/{request_id}/reject", response_model=AdminGoalUnlockRequestOut)
def reject_unlock_request(
    request_id: uuid.UUID,
    payload: AdminUnlockDecision = Body(default=AdminUnlockDecision()),
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    req = db.get(GoalUnlockRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Unlock request not found")
    if req.status != UnlockRequestStatus.pending:
        raise HTTPException(status_code=400, detail="This request has already been decided.")

    req.status = UnlockRequestStatus.rejected
    req.admin_note = payload.note

    db.add(
        Notification(
            user_id=req.user_id,
            type=NotificationType.system,
            title=f"'{req.goal_title}' erta ochish so'rovi rad etildi",
            message=payload.note or "Maqsad hozircha qulflangan bo'lib qoladi.",
        )
    )

    db.commit()
    db.refresh(req)
    goal = db.get(Goal, req.goal_id)
    user = db.get(User, req.user_id)
    return AdminGoalUnlockRequestOut(
        **GoalUnlockRequestOut.model_validate(req).model_dump(),
        user_id=user.id,
        user_email=user.email,
        user_full_name=user.full_name,
        goal_still_locked=bool(goal and goal.is_locked),
    )


# --------------------------------------------------------------------------
# Family/group goal - member withdrawal requests
# --------------------------------------------------------------------------

@router.get("/member-withdraw-requests", response_model=list[AdminGoalMemberWithdrawRequestOut])
def list_member_withdraw_requests(
    status_filter: MemberWithdrawRequestStatus | None = Query(None, alias="status"),
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    stmt = (
        select(GoalMemberWithdrawRequest, User)
        .join(User, User.id == GoalMemberWithdrawRequest.user_id)
        .order_by(GoalMemberWithdrawRequest.created_at.desc())
    )
    if status_filter:
        stmt = stmt.where(GoalMemberWithdrawRequest.status == status_filter)
    else:
        stmt = stmt.where(GoalMemberWithdrawRequest.status == MemberWithdrawRequestStatus.pending)

    rows = db.execute(stmt).all()
    results = []
    for req, user in rows:
        confirmation_rows = db.execute(
            select(GoalMemberWithdrawConfirmation, User)
            .join(User, User.id == GoalMemberWithdrawConfirmation.user_id)
            .where(GoalMemberWithdrawConfirmation.request_id == req.id)
        ).all()
        confirmations = [
            {"user_id": u.id, "full_name": u.full_name, "decision": c.decision.value} for c, u in confirmation_rows
        ]
        all_confirmed = all(c.decision == ConfirmationDecision.approved for c, _ in confirmation_rows)
        results.append(
            AdminGoalMemberWithdrawRequestOut(
                **GoalMemberWithdrawRequestOut.model_validate(req).model_dump(exclude={"confirmations", "all_confirmed"}),
                confirmations=confirmations,
                all_confirmed=all_confirmed,
                user_id=user.id,
                user_email=user.email,
                user_full_name=user.full_name,
            )
        )
    return results


@router.post("/member-withdraw-requests/{request_id}/approve", response_model=AdminGoalMemberWithdrawRequestOut)
def approve_member_withdraw_request(
    request_id: uuid.UUID,
    payload: AdminUnlockDecision = Body(default=AdminUnlockDecision()),
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    """Actually moves the money. For an 'own_share' request: a real income
    entry for exactly the requesting member's amount (never more than what
    they personally put in), reducing both their own share and the goal's
    total. For a 'collect_all' request: the requester gets the goal's
    ENTIRE current balance instead, and every member's contributed_amount
    (not just the requester's) resets to 0 - the box is empty, so nobody's
    row should still claim they have money sitting in it. The actual
    lifetime record of who contributed what already lives on permanently as
    real Expense/Income rows (visible in Transactions), so nothing is lost
    by clearing this running total."""
    req = db.get(GoalMemberWithdrawRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status != MemberWithdrawRequestStatus.pending:
        raise HTTPException(status_code=400, detail="This request has already been decided.")

    pending_or_rejected = db.scalars(
        select(GoalMemberWithdrawConfirmation).where(
            GoalMemberWithdrawConfirmation.request_id == req.id,
            GoalMemberWithdrawConfirmation.decision != ConfirmationDecision.approved,
        )
    ).all()
    if pending_or_rejected:
        raise HTTPException(
            status_code=400,
            detail="Not every other member of this goal has confirmed yet - can't release the money until they have.",
        )

    goal = db.get(Goal, req.goal_id)
    member = db.scalar(
        select(GoalMember).where(GoalMember.goal_id == req.goal_id, GoalMember.user_id == req.user_id)
    )
    if not goal or not member:
        raise HTTPException(status_code=400, detail="The goal or membership behind this request no longer exists.")

    if req.request_type == MemberWithdrawRequestType.collect_all:
        amount = min(req.amount, float(goal.current_amount))
        source_label = f"Oilaviy qutidan yig'ib olindi: {req.goal_title}"
    else:
        amount = min(req.amount, float(member.contributed_amount))
        source_label = f"Oilaviy maqsaddan qaytarildi: {req.goal_title}"

    if amount > 0:
        db.add(
            Income(
                user_id=req.user_id,
                source_name=source_label,
                amount=amount,
                currency=req.currency,
                income_date=date.today(),
                goal_id=goal.id,
                is_goal_transfer=True,
            )
        )
        if req.request_type == MemberWithdrawRequestType.own_share:
            member.contributed_amount = float(member.contributed_amount) - amount
        else:
            # Collect-all empties the whole box - every member's row should
            # reflect that, not just the person who received the payout.
            db.execute(
                update(GoalMember).where(GoalMember.goal_id == goal.id).values(contributed_amount=0)
            )
        goal.current_amount = max(0, float(goal.current_amount) - amount)
        if goal.current_amount <= 0:
            goal.is_locked = False
        goal.is_completed = goal.current_amount >= goal.target_amount

    req.status = MemberWithdrawRequestStatus.approved
    req.admin_note = payload.note

    if req.request_type == MemberWithdrawRequestType.collect_all:
        notif_title = f"'{req.goal_title}' qutisi butunlay yig'ib olindi"
        notif_message = payload.note or f"{amount:,.0f} {req.currency} balansingizga qaytarildi."
    else:
        notif_title = f"'{req.goal_title}' dagi ulushingiz qaytarildi"
        notif_message = payload.note or f"{amount:,.0f} {req.currency} balansingizga qaytarildi."

    db.add(
        Notification(
            user_id=req.user_id,
            type=NotificationType.system,
            title=notif_title,
            message=notif_message,
        )
    )

    db.commit()
    db.refresh(req)
    user = db.get(User, req.user_id)
    return AdminGoalMemberWithdrawRequestOut(
        **GoalMemberWithdrawRequestOut.model_validate(req).model_dump(),
        user_id=user.id,
        user_email=user.email,
        user_full_name=user.full_name,
    )


@router.post("/member-withdraw-requests/{request_id}/reject", response_model=AdminGoalMemberWithdrawRequestOut)
def reject_member_withdraw_request(
    request_id: uuid.UUID,
    payload: AdminUnlockDecision = Body(default=AdminUnlockDecision()),
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    req = db.get(GoalMemberWithdrawRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status != MemberWithdrawRequestStatus.pending:
        raise HTTPException(status_code=400, detail="This request has already been decided.")

    req.status = MemberWithdrawRequestStatus.rejected
    req.admin_note = payload.note

    db.add(
        Notification(
            user_id=req.user_id,
            type=NotificationType.system,
            title=f"'{req.goal_title}' dagi so'rovingiz rad etildi",
            message=payload.note or "Admin so'rovingizni rad etdi.",
        )
    )

    db.commit()
    db.refresh(req)
    user = db.get(User, req.user_id)
    return AdminGoalMemberWithdrawRequestOut(
        **GoalMemberWithdrawRequestOut.model_validate(req).model_dump(),
        user_id=user.id,
        user_email=user.email,
        user_full_name=user.full_name,
    )


# --------------------------------------------------------------------------
# Bug reports
# --------------------------------------------------------------------------

@router.get("/reports", response_model=list[AdminReportOut])
def list_reports(
    status_filter: ReportStatus | None = Query(None, alias="status"),
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    stmt = select(Report, User).join(User, User.id == Report.user_id).order_by(Report.created_at.desc())
    if status_filter:
        stmt = stmt.where(Report.status == status_filter)

    rows = db.execute(stmt).all()
    return [
        AdminReportOut(
            **ReportOut.model_validate(report).model_dump(),
            user_id=report.user_id,
            user_email=user.email,
            user_full_name=user.full_name,
        )
        for report, user in rows
    ]


@router.post("/reports/{report_id}/reply", response_model=AdminReportOut)
def reply_to_report(
    report_id: uuid.UUID,
    payload: AdminReportReply,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.admin_reply = payload.reply
    report.status = ReportStatus.solved

    db.add(
        Notification(
            user_id=report.user_id,
            type=NotificationType.system,
            title=f"Reply to your report: {report.subject}",
            message=payload.reply,
        )
    )
    db.commit()
    db.refresh(report)
    target_user = db.get(User, report.user_id)
    return AdminReportOut(
        **ReportOut.model_validate(report).model_dump(),
        user_id=report.user_id,
        user_email=target_user.email,
        user_full_name=target_user.full_name,
    )


@router.post("/reports/{report_id}/solve", status_code=204)
def mark_report_solved(
    report_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = ReportStatus.solved
    db.commit()
    return None


@router.delete("/reports/{report_id}", status_code=204)
def delete_report(
    report_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
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
