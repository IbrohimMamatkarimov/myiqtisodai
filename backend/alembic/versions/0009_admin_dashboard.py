"""admin dashboard: phone, last_login, bug reports

Adds fields needed for the expanded admin panel: phone number and last
login timestamp on users, plus a reports table for user-submitted bug
reports that admins can review and reply to.

Revision ID: 0009_admin_dashboard
Revises: 0008_chat_messages
Create Date: 2026-08-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0009_admin_dashboard"
down_revision: Union[str, None] = "0008_chat_messages"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(length=30), nullable=True))
    op.add_column("users", sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))

    # Raw SQL with an exception guard instead of SQLAlchemy's checkfirst=True -
    # this database already has a stray "reportstatus" type from something
    # outside this migration's own history, and checkfirst wasn't reliably
    # detecting it, so this makes creation idempotent regardless of why.
    op.execute(
        """
        DO $$
        BEGIN
            CREATE TYPE reportstatus AS ENUM ('open', 'solved');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    report_status = postgresql.ENUM("open", "solved", name="reportstatus", create_type=False)

    op.create_table(
        "reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("subject", sa.Text(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", report_status, nullable=False, server_default="open"),
        sa.Column("admin_reply", sa.Text(), nullable=True),
    )
    op.create_index("ix_reports_user_id", "reports", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_reports_user_id", table_name="reports")
    op.drop_table("reports")
    op.execute("DROP TYPE IF EXISTS reportstatus")
    op.drop_column("users", "last_login_at")
    op.drop_column("users", "phone")
