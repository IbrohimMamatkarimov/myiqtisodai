"""One-off script: fix pre-existing "the box is empty but my row still shows
money" data left over from before a collect-all payout properly reset every
member's contributed_amount (see approve_member_withdraw_request in
app/api/v1/endpoints/admin.py - that code path is already fixed going
forward; this script just cleans up rows a PAST collect-all left stale).

For every group goal whose box is currently empty (current_amount == 0), any
member row still showing contributed_amount > 0 is stale and gets reset to 0.
Dry-run by default - prints what it WOULD change without touching the
database. Pass --apply to actually commit the fix.

Usage (from backend/, with the venv active):
    python fix_stale_contributed_amounts.py            # dry run, just prints
    python fix_stale_contributed_amounts.py --apply     # actually fixes it
"""
import sys

from sqlalchemy import select

from app.db.session import SessionLocal
from app import models  # noqa: F401 - registers all model metadata (fixes
                          # 'When initializing mapper ... failed to locate a
                          # name' errors from relationships like User.debts
                          # that reference model classes this script would
                          # otherwise never import on its own)
from app.models.goal import Goal
from app.models.goal_member import GoalMember


def main():
    apply = "--apply" in sys.argv
    db = SessionLocal()
    try:
        empty_group_goals = db.scalars(
            select(Goal).where(Goal.is_group.is_(True), Goal.current_amount == 0)
        ).all()

        total_fixed = 0
        for goal in empty_group_goals:
            stale_members = db.scalars(
                select(GoalMember).where(
                    GoalMember.goal_id == goal.id,
                    GoalMember.contributed_amount > 0,
                )
            ).all()
            for member in stale_members:
                print(
                    f"[{'FIX' if apply else 'WOULD FIX'}] goal={goal.title!r} ({goal.id}) "
                    f"member user_id={member.user_id} contributed_amount="
                    f"{member.contributed_amount} -> 0"
                )
                if apply:
                    member.contributed_amount = 0
                total_fixed += 1

        if apply:
            db.commit()
            print(f"\nDone - reset {total_fixed} stale member row(s).")
        else:
            print(f"\nDry run - {total_fixed} stale member row(s) would be reset.")
            print("Re-run with --apply to actually make the change.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
