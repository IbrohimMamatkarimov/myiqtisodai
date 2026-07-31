"""add expense scanner + receipt fields

Fields already existed on ExpenseCreate/ExpenseOut schemas (merchant_name,
payment_method, receipt_number, receipt_image, ai_category) but were never
present on the Expense model or created in the database - this would have
crashed create_expense() the moment any of them were populated. Adding them
here alongside the new receipt-scanner fields (receipt_time, tax_amount,
products).

Revision ID: 0005_receipt_scanner
Revises: 0004_income_precision
Create Date: 2026-07-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0005_receipt_scanner"
down_revision: Union[str, None] = "0004_income_precision"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("expenses", sa.Column("merchant_name", sa.String(length=160), nullable=True))
    op.add_column("expenses", sa.Column("payment_method", sa.String(length=32), nullable=True))
    op.add_column("expenses", sa.Column("receipt_number", sa.String(length=64), nullable=True))
    op.add_column("expenses", sa.Column("receipt_image", sa.Text(), nullable=True))
    op.add_column("expenses", sa.Column("ai_category", sa.String(length=120), nullable=True))

    op.add_column("expenses", sa.Column("receipt_time", sa.String(length=16), nullable=True))
    op.add_column("expenses", sa.Column("tax_amount", sa.Numeric(14, 2), nullable=True))
    op.add_column("expenses", sa.Column("products", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("expenses", "products")
    op.drop_column("expenses", "tax_amount")
    op.drop_column("expenses", "receipt_time")

    op.drop_column("expenses", "ai_category")
    op.drop_column("expenses", "receipt_image")
    op.drop_column("expenses", "receipt_number")
    op.drop_column("expenses", "payment_method")
    op.drop_column("expenses", "merchant_name")
