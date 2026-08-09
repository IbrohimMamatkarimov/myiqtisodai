"""goal unlock requests (admin approve/reject early unlock)

Revision ID: 0014_goal_unlock_requests
Revises: 0013_goal_time_lock
Create Date: 2026-08-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0014_goal_unlock_requests"
down_revision: Union[str, None] = "0013_goal_time_lock"
branch_labels = None
depends_on = None

status_enum = postgresql.ENUM(
    "pending", "approved", "rejected", name="unlockrequeststatus", create_type=False
)


def upgrade() -> None:
    bind = op.get_bind()
    status_enum.create(bind, checkfirst=True)

    op.create_table(
        "goal_unlock_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("goal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("goals.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("goal_title", sa.Text(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", status_enum, server_default="pending", nullable=False),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("goal_unlock_requests")
    bind = op.get_bind()
    status_enum.drop(bind, checkfirst=True)
