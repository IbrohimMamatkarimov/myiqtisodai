"""goal fund locking: allocate/withdraw with a PIN

Adds the ability to move money from the user's overall balance into a
locked goal - the allocation shows up as a real expense (so balance and
reports stay accurate), and the goal can only be unlocked (money moved
back as income) by re-entering the PIN set at allocation time.

Revision ID: 0012_goal_locking
Revises: 0011_merge_heads
Create Date: 2026-08-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0012_goal_locking"
down_revision: Union[str, None] = "0011_merge_heads"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("goals", sa.Column("pin_hash", sa.String(length=255), nullable=True))
    op.add_column("goals", sa.Column("is_locked", sa.Boolean(), nullable=False, server_default=sa.false()))

    op.add_column(
        "expenses",
        sa.Column(
            "goal_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("goals.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column("expenses", sa.Column("is_goal_transfer", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index("ix_expenses_goal_id", "expenses", ["goal_id"])

    op.add_column(
        "incomes",
        sa.Column(
            "goal_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("goals.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column("incomes", sa.Column("is_goal_transfer", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index("ix_incomes_goal_id", "incomes", ["goal_id"])


def downgrade() -> None:
    op.drop_index("ix_incomes_goal_id", table_name="incomes")
    op.drop_column("incomes", "is_goal_transfer")
    op.drop_column("incomes", "goal_id")

    op.drop_index("ix_expenses_goal_id", table_name="expenses")
    op.drop_column("expenses", "is_goal_transfer")
    op.drop_column("expenses", "goal_id")

    op.drop_column("goals", "is_locked")
    op.drop_column("goals", "pin_hash")
