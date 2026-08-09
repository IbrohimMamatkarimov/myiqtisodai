"""debts table (qarz daftarcha)

A simple personal ledger of money lent to or borrowed from specific
people. Not wired into income/expense totals - lending/borrowing isn't
revenue or spending.

Revision ID: 0014_debts
Revises: 0013_goal_time_lock
Create Date: 2026-08-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0014_debts"
down_revision: Union[str, None] = "0013_goal_time_lock"
branch_labels = None
depends_on = None

debt_direction = postgresql.ENUM("lent", "borrowed", name="debtdirection", create_type=False)


def upgrade() -> None:
    debt_direction.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "debts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("person_name", sa.String(length=160), nullable=False),
        sa.Column("direction", debt_direction, nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="UZS"),
        sa.Column("debt_date", sa.Date(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_paid", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_debts_user_id", "debts", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_debts_user_id", table_name="debts")
    op.drop_table("debts")
    debt_direction.drop(op.get_bind(), checkfirst=True)
