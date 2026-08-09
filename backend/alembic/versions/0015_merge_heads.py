"""merge heads

0014_debts and 0014_goal_unlock_requests were created independently off the
same parent (0013_goal_time_lock). Merges them back into one history.

Revision ID: 0015_merge_heads
Revises: 0014_debts, 0014_goal_unlock_requests
Create Date: 2026-08-09

"""
from typing import Sequence, Union

revision: str = "0015_merge_heads"
down_revision: Union[str, None] = ("0014_debts", "0014_goal_unlock_requests")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
