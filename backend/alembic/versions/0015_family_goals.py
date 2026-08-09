"""family/group goals - shared box with per-member contributions

A goal can have more than one member (invited by email/phone). Each
member's own money moves in/out separately - goal_members.contributed_amount
tracks what THAT person put in, so they can only ever claim back their own
share, never the whole pot. Getting money back always goes through an admin
approval (goal_member_withdraw_requests), same spirit as the personal-goal
time-lock unlock requests but always required for group goals, regardless
of any time lock.

Revision ID: 0015_family_goals
Revises: 0014_debts
Create Date: 2026-08-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0015_family_goals"
down_revision: Union[str, None] = "0014_debts"
branch_labels = None
depends_on = None

withdraw_request_status = postgresql.ENUM(
    "pending", "approved", "rejected", name="memberwithdrawrequeststatus", create_type=False
)


def upgrade() -> None:
    op.add_column("goals", sa.Column("is_group", sa.Boolean(), nullable=False, server_default=sa.false()))

    op.create_table(
        "goal_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("goal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("goals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("contributed_amount", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("goal_id", "user_id", name="uq_goal_members_goal_user"),
    )
    op.create_index("ix_goal_members_goal_id", "goal_members", ["goal_id"])
    op.create_index("ix_goal_members_user_id", "goal_members", ["user_id"])

    withdraw_request_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "goal_member_withdraw_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("goal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("goals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("goal_title", sa.Text(), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="UZS"),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", withdraw_request_status, nullable=False, server_default="pending"),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_goal_member_withdraw_requests_goal_id", "goal_member_withdraw_requests", ["goal_id"])
    op.create_index("ix_goal_member_withdraw_requests_user_id", "goal_member_withdraw_requests", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_goal_member_withdraw_requests_user_id", table_name="goal_member_withdraw_requests")
    op.drop_index("ix_goal_member_withdraw_requests_goal_id", table_name="goal_member_withdraw_requests")
    op.drop_table("goal_member_withdraw_requests")
    withdraw_request_status.drop(op.get_bind(), checkfirst=True)

    op.drop_index("ix_goal_members_user_id", table_name="goal_members")
    op.drop_index("ix_goal_members_goal_id", table_name="goal_members")
    op.drop_table("goal_members")

    op.drop_column("goals", "is_group")
