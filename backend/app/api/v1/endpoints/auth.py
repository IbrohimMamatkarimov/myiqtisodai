import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_email_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.core.config import settings
from app.models.user import User
from app.schemas.user import (
    ChangePassword,
    ForgotPassword,
    RefreshTokenRequest,
    ResetPassword,
    Token,
    UserCreate,
    UserLogin,
    UserOut,
    VerifyEmail,
)
from app.services.email import (
    send_password_reset_email,
    send_verification_email,
)
from app.utils.seed_categories import seed_default_categories

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger("myiqtisod.auth")


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.email == payload.email))

    if existing:
        if existing.onboarding_completed:
            raise HTTPException(
                status_code=400,
                detail="Email already registered",
            )
        # They registered before but abandoned onboarding partway through (closed
        # the tab, tried a different email, etc). Rather than permanently blocking
        # this email, let them claim the same account and start fresh - update the
        # password in case they've forgotten what they used the first time, and
        # send a fresh verification link rather than logging them straight in.
        existing.hashed_password = hash_password(payload.password)
        existing.language = payload.language
        existing.is_email_verified = False
        db.commit()
        db.refresh(existing)

        verify_token = create_email_token(
            str(existing.id),
            purpose="verify_email",
        )
        send_verification_email(existing.email, verify_token)

        return {
            "message": "Please check your email to verify your account before logging in.",
            "email": existing.email,
        }

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        # Real name is collected on Onboarding Screen 1 (complete-onboarding);
        # this is just a NOT-NULL placeholder until then.
        full_name=payload.email.split("@")[0],

        language=payload.language,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    seed_default_categories(user.id)

    verify_token = create_email_token(
        str(user.id),
        purpose="verify_email",
    )

    send_verification_email(user.email, verify_token)

    # No tokens issued here anymore - the account can't be used until the
    # verification link is clicked and the user logs in through /login,
    # which enforces is_email_verified. Issuing tokens here would let
    # anyone skip verification entirely by just registering.
    return {
        "message": "Please check your email to verify your account before logging in.",
        "email": user.email,
    }


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))

    if not user or not verify_password(
        payload.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is disabled",
        )

    if not user.is_email_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email before logging in. Check your inbox for the verification link.",
        )

    return Token(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=Token)
def refresh_token(payload: RefreshTokenRequest):
    data = decode_token(payload.refresh_token)

    if not data or data.get("type") != "refresh":
        raise HTTPException(
            status_code=401,
            detail="Invalid refresh token",
        )

    user_id = data["sub"]

    return Token(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
    )


@router.post("/verify-email", status_code=status.HTTP_200_OK)
def verify_email(payload: VerifyEmail, db: Session = Depends(get_db)):
    data = decode_token(payload.token)

    if not data or data.get("type") != "verify_email":
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired verification link",
        )

    user = db.get(User, uuid.UUID(data["sub"]))

    if not user:
        raise HTTPException(
            status_code=404,
            detail="This verification link is no longer valid. Please sign up again to get a new one.",
        )

    user.is_email_verified = True
    db.commit()

    return {
        "message": "Email verified successfully",
    }


@router.post("/resend-verification", status_code=status.HTTP_200_OK)
def resend_verification(payload: ForgotPassword, db: Session = Depends(get_db)):
    # Reuses ForgotPassword's shape (just an email field) - same generic
    # response either way so this can't be used to check which emails exist.
    user = db.scalar(select(User).where(User.email == payload.email))

    if user and not user.is_email_verified:
        verify_token = create_email_token(
            str(user.id),
            purpose="verify_email",
        )
        send_verification_email(user.email, verify_token)

    return {
        "message": "If that email exists and isn't verified yet, a new verification link has been sent.",
    }


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(payload: ForgotPassword, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))

    dev_link = None
    if user:
        token = create_email_token(
            str(user.id),
            purpose="reset_password",
            minutes=60,
        )

        dev_link = send_password_reset_email(
            user.email,
            token,
        )
        logger.info(
            "Password reset requested for %s (user found) - email send attempted. "
            "If it doesn't arrive, check the lines just above this one for a "
            "'Failed to send email' traceback.",
            payload.email,
        )
    else:
        # Not a bug - this is intentional (never reveal whether an email is
        # registered). But it looks EXACTLY like "the email isn't sending"
        # if you're testing with an email that has no account, so log it
        # loudly here rather than staying silent.
        logger.warning(
            "Password reset requested for %s - NO account with this email exists, so nothing was sent.",
            payload.email,
        )

    response = {
        "message": "If that email exists, a reset link has been sent.",
    }
    # DEV CONVENIENCE ONLY: real SMTP isn't configured yet (see
    # app/services/email.py), so surface the link directly in the response
    # while developing instead of it disappearing into a console log.
    # Remove this once real SMTP credentials are set in .env.
    if settings.DEBUG and dev_link:
        response["dev_reset_link"] = dev_link

    return response


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(payload: ResetPassword, db: Session = Depends(get_db)):
    data = decode_token(payload.token)

    if not data or data.get("type") != "reset_password":
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset link",
        )

    user = db.get(User, uuid.UUID(data["sub"]))

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    user.hashed_password = hash_password(payload.new_password)
    db.commit()

    return {
        "message": "Password reset successfully",
    }


@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    payload: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(
        payload.current_password,
        current_user.hashed_password,
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect",
        )

    current_user.hashed_password = hash_password(payload.new_password)

    db.commit()

    return {
        "message": "Password changed successfully",
    }


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
