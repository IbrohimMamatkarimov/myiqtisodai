"""account deletion request workflow

Deleting your own account used to be instant (DELETE /users/me just deleted
the row). Adding a request/approve flow instead: the user submits a reason,
an admin (is_superuser) sees it and approves or rejects it.

Revision ID: 0007_deletion_requests
Revises: 0006_goal_currency
Create Date: 2026-08-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0007_deletion_requests"
down_revision: Union[str, None] = "0006_goal_currency"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("deletion_requested", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("users", sa.Column("deletion_reason", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("deletion_requested_at", sa.DateTime(timezone=True), nullable=True))
    op.alter_column("users", "deletion_requested", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "deletion_requested_at")
    op.drop_column("users", "deletion_reason")
    op.drop_column("users", "deletion_requested")
