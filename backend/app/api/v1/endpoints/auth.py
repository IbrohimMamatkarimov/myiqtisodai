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
from app.services.email import send_password_reset_email, send_verification_email
from app.utils.seed_categories import seed_default_categories

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        language=payload.language,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    seed_default_categories(user.id)

    token = create_email_token(str(user.id), purpose="verify_email")
    send_verification_email(user.email, token)

    return user


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    return Token(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=Token)
def refresh_token(payload: RefreshTokenRequest):
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = data["sub"]
    return Token(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
    )


@router.post("/verify-email", status_code=status.HTTP_200_OK)
def verify_email(payload: VerifyEmail, db: Session = Depends(get_db)):
    data = decode_token(payload.token)
    if not data or data.get("type") != "verify_email":
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")

    user = db.get(User, uuid.UUID(data["sub"]))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_email_verified = True
    db.commit()
    return {"message": "Email verified successfully"}


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(payload: ForgotPassword, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))
    # Always return 200 to avoid leaking which emails are registered.
    if user:
        token = create_email_token(str(user.id), purpose="reset_password", minutes=60)
        send_password_reset_email(user.email, token)
    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(payload: ResetPassword, db: Session = Depends(get_db)):
    data = decode_token(payload.token)
    if not data or data.get("type") != "reset_password":
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user = db.get(User, uuid.UUID(data["sub"]))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password reset successfully"}


@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    payload: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
