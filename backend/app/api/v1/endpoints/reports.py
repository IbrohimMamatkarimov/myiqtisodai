import io
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.category import Category
from app.models.expense import Expense
from app.models.user import User

router = APIRouter(prefix="/reports", tags=["Reports"])


def _get_expense_rows(db: Session, user_id, start_date: date, end_date: date):
    return (
        db.query(Expense.expense_date, Expense.amount, Expense.description, Category.name)
        .outerjoin(Category, Expense.category_id == Category.id)
        .filter(
            Expense.user_id == user_id,
            Expense.expense_date >= start_date,
            Expense.expense_date <= end_date,
        )
        .order_by(Expense.expense_date)
        .all()
    )


@router.get("/category-breakdown")
def category_breakdown(
    start_date: date,
    end_date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Category.name, func.sum(Expense.amount).label("total"))
        .join(Expense, Expense.category_id == Category.id)
        .filter(
            Expense.user_id == current_user.id,
            Expense.expense_date >= start_date,
            Expense.expense_date <= end_date,
        )
        .group_by(Category.name)
        .order_by(func.sum(Expense.amount).desc())
        .all()
    )
    return [{"category": name, "total": float(total)} for name, total in rows]


@router.get("/export/excel")
def export_excel(
    start_date: date,
    end_date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    import openpyxl

    rows = _get_expense_rows(db, current_user.id, start_date, end_date)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Expenses"
    ws.append(["Date", "Amount", "Description", "Category"])
    for r in rows:
        ws.append([r[0].isoformat(), float(r[1]), r[2] or "", r[3] or "Uncategorized"])

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=expenses_{start_date}_{end_date}.xlsx"},
    )


@router.get("/export/pdf")
def export_pdf(
    start_date: date,
    end_date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle

    rows = _get_expense_rows(db, current_user.id, start_date, end_date)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    data = [["Date", "Amount", "Description", "Category"]]
    for r in rows:
        data.append([r[0].isoformat(), f"{float(r[1]):.2f}", r[2] or "", r[3] or "Uncategorized"])

    table = Table(data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E2A78")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
            ]
        )
    )
    doc.build([table])
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=expenses_{start_date}_{end_date}.pdf"},
    )
