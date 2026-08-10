"""goal member withdraw requests: add 'completed' status

The request-confirmation flow could reach full member approval but then had
no way to actually move money or mark itself done - 'approved' was declared
on the model but never set anywhere, and there was no terminal state after
release. This repurposes 'approved' to mean "every member confirmed,
awaiting admin release" and adds 'completed' for after the admin actually
releases the funds.

Revision ID: 0021_withdraw_completed_status
Revises: 0020_collect_all
Create Date: 2026-08-10

"""
from typing import Sequence, Union

from alembic import op

revision: str = "0021_withdraw_completed_status"
down_revision: Union[str, None] = "0020_collect_all"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE memberwithdrawrequeststatus ADD VALUE IF NOT EXISTS 'completed'")


def downgrade() -> None:
    # Postgres can't drop a single enum value - no-op (a completed row would
    # need to be manually reassigned before downgrading past this point).
    pass
