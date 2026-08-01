import uuid

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


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
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
        # re-issue tokens straight into onboarding.
        existing.hashed_password = hash_password(payload.password)
        existing.language = payload.language
        db.commit()
        db.refresh(existing)

        return Token(
            access_token=create_access_token(str(existing.id)),
            refresh_token=create_refresh_token(str(existing.id)),
        )

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

    # Log the user straight in so they can go directly into onboarding
    # without a second login step.
    return Token(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


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
            detail="User not found",
        )

    user.is_email_verified = True
    db.commit()

    return {
        "message": "Email verified successfully",
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
