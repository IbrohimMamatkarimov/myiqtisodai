"""collect-all withdrawal requests + per-member confirmation PIN

Adds a second kind of group-goal withdrawal request alongside the existing
"give me back my own share" one: a member can ask to collect the ENTIRE
box balance (not just their own contribution). Every other accepted member
still has to sign off before an admin can release it - same as before -
but for this type specifically, confirming requires that member's own PIN
(set the first time they ever confirm one of these), not just a button
tap, since it's authorizing money that isn't only theirs to leave the box.

Revision ID: 0020_collect_all
Revises: 0019_withdraw_confirmations
Create Date: 2026-08-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0020_collect_all"
down_revision: Union[str, None] = "0019_withdraw_confirmations"
branch_labels = None
depends_on = None

request_type_enum = postgresql.ENUM("own_share", "collect_all", name="goalmemberwithdrawrequesttype", create_type=False)


def upgrade() -> None:
    request_type_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "goal_member_withdraw_requests",
        sa.Column("request_type", request_type_enum, nullable=False, server_default="own_share"),
    )
    op.add_column(
        "goal_members",
        sa.Column("confirm_pin_hash", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("goal_members", "confirm_pin_hash")
    op.drop_column("goal_member_withdraw_requests", "request_type")
    request_type_enum.drop(op.get_bind(), checkfirst=True)
