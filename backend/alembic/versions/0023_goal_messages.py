"""group goal chat - members can discuss inside a shared box

A simple message thread scoped to one goal, visible only to its accepted
members (owner included). Not a general chat system - just enough for
"hey I added money" / "can we hit this by June?" type discussion right
where the money conversation is already happening.

Revision ID: 0023_goal_messages
Revises: 0022_date_of_birth
Create Date: 2026-08-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0023_goal_messages"
down_revision: Union[str, None] = "0022_date_of_birth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "goal_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("goal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("goals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_goal_messages_goal_id", "goal_messages", ["goal_id"])


def downgrade() -> None:
    op.drop_index("ix_goal_messages_goal_id", table_name="goal_messages")
    op.drop_table("goal_messages")
