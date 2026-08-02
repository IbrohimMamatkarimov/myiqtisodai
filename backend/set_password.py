"""One-off script: directly set a user's password by email, bypassing the
normal forgot-password email flow entirely. Useful if you're locked out and
the reset-link flow isn't reachable for some other reason (e.g. email
delivery, CORS, etc).

Usage (from backend/, with the venv active):
    python set_password.py your-login-email@example.com "NewPassword123!"
"""
import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User


def main():
    if len(sys.argv) != 3:
        print('Usage: python set_password.py <email> "<new_password>"')
        sys.exit(1)

    email, new_password = sys.argv[1], sys.argv[2]
    if len(new_password) < 8:
        print("Password should be at least 8 characters.")
        sys.exit(1)

    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == email))
        if not user:
            print(f"No user found with email: {email}")
            sys.exit(1)

        user.hashed_password = hash_password(new_password)
        db.commit()
        print(f"Done - password for {email} has been reset. You can log in with it now.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
