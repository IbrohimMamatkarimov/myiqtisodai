from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.report import Report
from app.models.user import User
from app.schemas.report import ReportCreate, ReportOut

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("", response_model=list[ReportOut])
def list_my_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(Report).where(Report.user_id == current_user.id).order_by(Report.created_at.desc())
    ).all()


@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def submit_report(
    payload: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = Report(
        user_id=current_user.id,
        subject=payload.subject,
        message=payload.message,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
