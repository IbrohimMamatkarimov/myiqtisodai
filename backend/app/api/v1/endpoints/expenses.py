import math
import json
import base64
import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.category import Category
from app.models.expense import Expense
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseOut, ExpenseUpdate, PaginatedExpenses, ReceiptScanResult
from app.services.receipt_scanner import scan_receipt, _downscale_image
from app.services.budget_alerts import check_budget_alerts
from app.services.image_gen import generate_image_url

router = APIRouter(prefix="/expenses", tags=["Expenses"])

MAX_RECEIPT_SIZE = 8 * 1024 * 1024  # 8 MB
# Real phones/browsers are inconsistent about the exact MIME string they send for
# the same photo - iPhones commonly send image/heic OR image/heif depending on iOS
# version, and some Android camera apps send the nonstandard "image/jpg" instead of
# "image/jpeg". The old list only covered the "textbook" values, so a real receipt
# photo would get flat-out rejected before ever reaching the scanner.
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
}


@router.get("", response_model=PaginatedExpenses)
def list_expenses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Search in description"),
    category_id: Optional[uuid.UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    sort_by: str = Query("expense_date", pattern="^(expense_date|amount|created_at)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    stmt = select(Expense).where(Expense.user_id == current_user.id)

    if search:
        stmt = stmt.where(
            or_(Expense.description.ilike(f"%{search}%"), Expense.merchant_name.ilike(f"%{search}%"))
        )
    if category_id:
        stmt = stmt.where(Expense.category_id == category_id)
    if start_date:
        stmt = stmt.where(Expense.expense_date >= start_date)
    if end_date:
        stmt = stmt.where(Expense.expense_date <= end_date)

    sort_col = getattr(Expense, sort_by)
    stmt = stmt.order_by(sort_col.desc() if sort_order == "desc" else sort_col.asc())

    total = len(db.scalars(stmt).all())
    items = db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all()

    return PaginatedExpenses(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(math.ceil(total / page_size), 1),
    )


def _serialize_products(data: dict) -> dict:
    """products arrives as a list[ProductLine]; the DB column is a JSON text blob."""
    if "products" in data and data["products"] is not None:
        data["products"] = json.dumps(
            [p if isinstance(p, dict) else p.model_dump() for p in data["products"]]
        )
    return data


@router.post("", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = _serialize_products(payload.model_dump())
    expense = Expense(user_id=current_user.id, **data)
    # Only generate an illustrative AI image for manually-entered expenses -
    # never overwrite/duplicate a real uploaded receipt photo.
    if not expense.receipt_image:
        subject = expense.description or expense.merchant_name or expense.ai_category
        expense.ai_image_url = generate_image_url(subject, kind="expense") if subject else None
    db.add(expense)
    db.commit()
    db.refresh(expense)
    check_budget_alerts(db, current_user.id, expense.category_id)
    return expense


def _get_owned_expense(db: Session, expense_id: uuid.UUID, user_id: uuid.UUID) -> Expense:
    expense = db.get(Expense, expense_id)
    if not expense or expense.user_id != user_id:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


@router.post("/scan", response_model=ReceiptScanResult)
async def scan_expense_receipt(
    file: UploadFile = File(...),
    language: str = Form("en"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reads an uploaded receipt image with an AI vision model and returns a prefilled
    draft for the user to review - this does NOT create an expense. The frontend shows
    the parsed fields in the add-expense form and the user still presses Save, which
    goes through the normal POST /expenses endpoint."""
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Please upload a JPEG, PNG, WEBP, or HEIC image.",
        )

    image_bytes = await file.read()
    if len(image_bytes) > MAX_RECEIPT_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image is too large (max 8MB).")

    categories = db.scalars(
        select(Category).where(Category.user_id == current_user.id, Category.type == "expense")
    ).all()
    category_names = [c.name for c in categories]

    result = scan_receipt(image_bytes, file.content_type, category_names, language)

    # Best-effort fuzzy match of the AI's suggested category name to a real category_id
    category_id = None
    if result.get("category_name"):
        guess = result["category_name"].strip().lower()
        for c in categories:
            if c.name.strip().lower() == guess or guess in c.name.strip().lower() or c.name.strip().lower() in guess:
                category_id = c.id
                break

    # Store the downscaled version, not the original multi-MB phone photo
    small_bytes, small_mime = _downscale_image(image_bytes, file.content_type)
    b64 = base64.b64encode(small_bytes).decode("utf-8")
    receipt_image = f"data:{small_mime};base64,{b64}"

    return ReceiptScanResult(
        merchant_name=result.get("merchant_name"),
        expense_date=result.get("expense_date") or None,
        receipt_time=result.get("receipt_time"),
        amount=result.get("amount"),
        currency=result.get("currency"),
        category_name=result.get("category_name"),
        category_id=category_id,
        products=result.get("products") or [],
        tax_amount=result.get("tax_amount"),
        description=result.get("description"),
        receipt_image=receipt_image,
        warning=result.get("warning"),
    )


@router.get("/{expense_id}", response_model=ExpenseOut)
def get_expense(
    expense_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_owned_expense(db, expense_id, current_user.id)


@router.patch("/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: uuid.UUID,
    payload: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = _get_owned_expense(db, expense_id, current_user.id)
    data = _serialize_products(payload.model_dump(exclude_unset=True))
    for field, value in data.items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = _get_owned_expense(db, expense_id, current_user.id)
    db.delete(expense)
    db.commit()
    return None
