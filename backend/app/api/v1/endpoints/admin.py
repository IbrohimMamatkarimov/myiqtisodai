import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_superuser
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import DeletionRequestOut, UserOut

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/deletion-requests", response_model=list[DeletionRequestOut])
def list_deletion_requests(
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    return db.scalars(select(User).where(User.deletion_requested.is_(True))).all()


@router.post("/deletion-requests/{user_id}/approve", status_code=204)
def approve_deletion_request(
    user_id: uuid.UUID,
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
    _: User = Depends(get_current_superuser),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target or not target.deletion_requested:
        raise HTTPException(status_code=404, detail="No pending deletion request for that user.")

    target.deletion_requested = False
    target.deletion_reason = None
    target.deletion_requested_at = None
    db.commit()
    db.refresh(target)
    return target
