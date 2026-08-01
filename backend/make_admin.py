"""One-off script: grant is_superuser=true to a user by email, so they can
access /admin in the app. Run once, then delete this file if you want.

Usage (from backend/, with the venv active):
    python make_admin.py your-login-email@example.com
"""
import sys

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.user import User


def main():
    if len(sys.argv) != 2:
        print("Usage: python make_admin.py <email>")
        sys.exit(1)

    email = sys.argv[1]
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == email))
        if not user:
            print(f"No user found with email: {email}")
            sys.exit(1)

        user.is_superuser = True
        db.commit()
        print(f"Done - {email} is now a superuser. Log out and back in to see the Admin link.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
