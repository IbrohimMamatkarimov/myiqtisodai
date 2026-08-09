"""group-goal withdrawal: every other member must confirm

A group-goal member requesting their own share back now needs every other
accepted member of the goal to confirm before an admin can release the
money - not just the requester and an admin. If anyone declines, the
request is rejected outright.

Revision ID: 0019_withdraw_confirmations
Revises: 0018_notification_link
Create Date: 2026-08-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0019_withdraw_confirmations"
down_revision: Union[str, None] = "0018_notification_link"
branch_labels = None
depends_on = None

confirmation_decision = postgresql.ENUM(
    "pending", "approved", "rejected", name="memberwithdrawconfirmationdecision", create_type=False
)


def upgrade() -> None:
    confirmation_decision.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "goal_member_withdraw_confirmations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "request_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("goal_member_withdraw_requests.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("decision", confirmation_decision, nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("request_id", "user_id", name="uq_withdraw_confirmation_request_user"),
    )
    op.create_index("ix_goal_member_withdraw_confirmations_request_id", "goal_member_withdraw_confirmations", ["request_id"])
    op.create_index("ix_goal_member_withdraw_confirmations_user_id", "goal_member_withdraw_confirmations", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_goal_member_withdraw_confirmations_user_id", table_name="goal_member_withdraw_confirmations")
    op.drop_index("ix_goal_member_withdraw_confirmations_request_id", table_name="goal_member_withdraw_confirmations")
    op.drop_table("goal_member_withdraw_confirmations")
    confirmation_decision.drop(op.get_bind(), checkfirst=True)
