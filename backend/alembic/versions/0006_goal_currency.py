"""add currency to goals

Goals always rendered using the user's account-wide currency setting, so a
goal saved in e.g. USD would silently be mis-formatted if the user's account
currency was UZS. Adding a per-goal currency so each goal can be created in
whichever currency it's actually being saved in.

Revision ID: 0006_goal_currency
Revises: 0005_receipt_scanner
Create Date: 2026-08-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006_goal_currency"
down_revision: Union[str, None] = "0005_receipt_scanner"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "goals",
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="UZS"),
    )
    # server_default only needed to backfill existing rows; drop it so future
    # inserts must supply currency explicitly via the model/schema default.
    op.alter_column("goals", "currency", server_default=None)


def downgrade() -> None:
    op.drop_column("goals", "currency")
