"""goal member invite status (pending/accepted)

goal_members.status wasn't part of the original 0015_family_goals table -
members were added as full members immediately with no accept/decline step.
Adding it now as a new migration (rather than editing the already-applied
0015 in place) so this is a normal additive schema change. Existing rows
grandfather in as 'accepted' - they already fully joined under the old
behavior, this isn't retroactively un-accepting anyone. Only NEW invites
(via the updated invite_goal_member endpoint) start as 'pending'.

Revision ID: 0017_goal_member_status
Revises: 0016_merge_heads
Create Date: 2026-08-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0017_goal_member_status"
down_revision: Union[str, None] = "0016_merge_heads"
branch_labels = None
depends_on = None

status_enum = postgresql.ENUM("pending", "accepted", name="goalmemberstatus", create_type=False)


def upgrade() -> None:
    status_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "goal_members",
        sa.Column("status", status_enum, nullable=False, server_default="accepted"),
    )


def downgrade() -> None:
    op.drop_column("goal_members", "status")
    status_enum.drop(op.get_bind(), checkfirst=True)
