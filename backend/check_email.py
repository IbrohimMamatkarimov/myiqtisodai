"""One-off script: check whether a given email is actually a registered
user (helps debug "forgot password says sent but nothing arrives" - the
endpoint intentionally stays silent about whether an email exists, for
security, so this checks it directly instead).

Usage (from backend/, with the venv active):
    python check_email.py someone@example.com
"""
import sys

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.user import User


def main():
    if len(sys.argv) != 2:
        print("Usage: python check_email.py <email>")
        sys.exit(1)

    email = sys.argv[1]
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == email))
        if user:
            print(f"FOUND - {email} is registered (id={user.id}, onboarding_completed={user.onboarding_completed})")
        else:
            print(f"NOT FOUND - no user with email exactly '{email}'. Check for typos.")
            all_emails = db.scalars(select(User.email)).all()
            print("Registered emails in this database:")
            for e in all_emails:
                print(f"  - {e}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
