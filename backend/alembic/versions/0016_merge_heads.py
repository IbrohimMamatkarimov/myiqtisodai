"""merge heads

0015_family_goals and 0015_merge_heads were created independently off the
same parent (0014_debts): one added the family/group-goal columns and
tables, the other resolved an earlier 0014 fork (0014_debts vs
0014_goal_unlock_requests). Both are real migrations that need to run -
this just merges them back into one history so `alembic upgrade head` has
a single unambiguous target again. No schema/data changes here.

This is very likely why goals.is_group was never actually created in the
database even though it's on the Goal model - alembic upgrade head can't
resolve multiple heads on its own, so 0015_family_goals's upgrade() never
ran.

Revision ID: 0016_merge_heads
Revises: 0015_family_goals, 0015_merge_heads
Create Date: 2026-08-09

"""
from typing import Sequence, Union

revision: str = "0016_merge_heads"
down_revision: Union[str, None] = ("0015_family_goals", "0015_merge_heads")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
