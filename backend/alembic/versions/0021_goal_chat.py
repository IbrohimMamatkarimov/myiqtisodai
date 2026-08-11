"""[SUPERSEDED / NO-OP - see note below]

This migration originally tried to add a group-goal chat feature
(goal_chat_messages table + goal_members.chat_last_read_at), written
without knowing a concurrent session had already built the same feature
more simply as goal_messages (migration 0023_goal_messages, no read-
receipt tracking at all - deliberately simpler). Rather than leave a
duplicate-head fork in the migration graph (this originally branched off
0020_collect_all, same as 0021_withdraw_completed_status), it's chained
in after the real tip (0023_goal_messages) and does nothing. No delete
tool was available to just remove the file outright.

Revision ID: 0021_goal_chat
Revises: 0023_goal_messages
Create Date: 2026-08-10

"""
from typing import Sequence, Union

revision: str = "0021_goal_chat"
down_revision: Union[str, None] = "0023_goal_messages"
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
