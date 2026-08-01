"""One-off script: delete every user EXCEPT superuser (admin) accounts.

Cascades automatically delete each user's expenses, incomes, categories,
goals, budgets, notifications, and AI conversations too (same cascade the
app already relies on for account deletion).

Safety: by default this only PRINTS who would be deleted (dry run). Pass
--confirm to actually delete.

Usage (from backend/, with the venv active):
    python delete_non_admins.py            # dry run - just lists them
    python delete_non_admins.py --confirm  # actually deletes them
"""
import sys

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.user import User


def main():
    confirm = "--confirm" in sys.argv

    db = SessionLocal()
    try:
        targets = db.scalars(select(User).where(User.is_superuser.is_(False))).all()

        if not targets:
            print("No non-admin users found - nothing to do.")
            return

        print(f"{'Deleting' if confirm else 'Would delete'} {len(targets)} user(s):")
        for u in targets:
            print(f"  - {u.email}")

        if not confirm:
            print("\nDry run only - nothing was deleted. Re-run with --confirm to actually delete these.")
            return

        for u in targets:
            db.delete(u)
        db.commit()
        print(f"\nDone - deleted {len(targets)} user(s) and all their data.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
