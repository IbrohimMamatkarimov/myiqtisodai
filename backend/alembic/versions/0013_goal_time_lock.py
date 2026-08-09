"""goal hard time lock (cooling-off period)

Adds lock_days (chosen at goal creation, e.g. 30/60/90) and locked_until
(computed when funds are first allocated). withdraw_funds refuses ANY
withdrawal - even with the correct PIN - until locked_until passes. This
is separate from is_locked/pin_hash, which only gate whether money can be
withdrawn at all, not when.

Revision ID: 0013_goal_time_lock
Revises: 0012_goal_locking
Create Date: 2026-08-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0013_goal_time_lock"
down_revision: Union[str, None] = "0012_goal_locking"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("goals", sa.Column("lock_days", sa.Integer(), nullable=True))
    op.add_column("goals", sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("goals", "locked_until")
    op.drop_column("goals", "lock_days")
