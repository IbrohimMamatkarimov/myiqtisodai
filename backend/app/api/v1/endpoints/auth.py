import uuid
import logging
import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from google.auth.exceptions import TransportError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

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
    AuthSession,
    ChangePassword,
    ForgotPassword,
    GoogleAuthRequest,
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
from app.utils.seed_categories import add_default_categories

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger("myiqtisod.auth")


def _deliver_verification(email: str, user_id: str) -> None:
    token = create_email_token(user_id, purpose="verify_email")
    if not send_verification_email(email, token):
        raise HTTPException(
            status_code=503,
            detail={"code": "verification_delivery_failed", "message": "Could not send the verification email. Please try again."},
        )


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    responses={503: {"description": "Verification email delivery failed. Registration can be retried."}},
)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    email = str(payload.email)
    user = db.scalar(select(User).where(User.email == email))

    if user:
        if user.is_email_verified or not user.is_active:
            raise HTTPException(status_code=400, detail="Email already registered")
        user_id = str(user.id)
    else:
        user = User(
            email=email,
            hashed_password=hash_password(payload.password),
            full_name=email.split("@")[0],
            language=payload.language,
        )
        db.add(user)

        try:
            db.flush()
            add_default_categories(db, user.id)
            user_id = str(user.id)
            db.commit()
        except IntegrityError:
            db.rollback()
            if db.scalar(select(User.id).where(User.email == email)):
                raise HTTPException(status_code=409, detail="Registration is already in progress. Please try again.")
            raise

    _deliver_verification(email, user_id)
    return {
        "message": "Please check your email to verify your account before logging in.",
        "email": email,
    }


@router.post("/login", response_model=AuthSession)
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

    user.last_login_at = datetime.utcnow()
    profile = UserOut.model_validate(user)
    user_id = str(user.id)
    db.commit()

    return AuthSession(
        user=profile,
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
    )


@router.post("/google", response_model=AuthSession)
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Sign in (or auto-register) with Google. Verifies the ID token Google's
    Sign-In button handed the frontend, then either logs into an existing
    account with that email or creates a brand-new one - Google has already
    verified the email address, so is_email_verified is set True immediately
    (no separate verification email needed) and onboarding_completed stays
    False so they still go through the normal onboarding wizard once."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google sign-in isn't configured on this server yet.")

    try:
        idinfo = google_id_token.verify_oauth2_token(
            payload.credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID
        )
    except TransportError:
        raise HTTPException(status_code=503, detail="Google sign-in is temporarily unavailable. Please try again.")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google sign-in token")

    if not idinfo.get("email_verified", False):
        raise HTTPException(status_code=401, detail="Your Google email isn't verified")

    email = idinfo["email"]
    user = db.scalar(select(User).where(User.email == email))

    if not user:
        user = User(
            email=email,
            # Google-only accounts never log in with a password - a random,
            # never-shared value here just satisfies the NOT NULL column
            # and guarantees password login always fails for this account,
            # rather than leaving it guessable/blank.
            hashed_password=hash_password(secrets.token_urlsafe(32)),
            full_name=idinfo.get("name") or email.split("@")[0],
            is_email_verified=True,
        )
        db.add(user)
        db.flush()
        add_default_categories(db, user.id)
    elif not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    user.last_login_at = datetime.utcnow()
    profile = UserOut.model_validate(user)
    user_id = str(user.id)
    db.commit()

    return AuthSession(
        user=profile,
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
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


@router.post(
    "/resend-verification",
    status_code=status.HTTP_200_OK,
    responses={503: {"description": "Verification email delivery failed."}},
)
def resend_verification(payload: ForgotPassword, db: Session = Depends(get_db)):
    # Reuses ForgotPassword's shape (just an email field) - same generic
    # response either way so this can't be used to check which emails exist.
    user = db.scalar(select(User).where(User.email == payload.email))

    if user and not user.is_email_verified:
        _deliver_verification(user.email, str(user.id))

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
