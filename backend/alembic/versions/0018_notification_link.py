"""notification tap-to-navigate link

Adds an optional in-app path to notifications so tapping one can actually
take the person somewhere relevant (e.g. a goal invite notification links
to /goals) instead of just marking itself read and doing nothing.

Revision ID: 0018_notification_link
Revises: 0017_goal_member_status
Create Date: 2026-08-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0018_notification_link"
down_revision: Union[str, None] = "0017_goal_member_status"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("notifications", sa.Column("link", sa.String(length=200), nullable=True))


def downgrade() -> None:
    op.drop_column("notifications", "link")
