"""add date_of_birth to users

Simplifying onboarding to just full name, date of birth, and place
(country) instead of the full 5-screen questionnaire - the rest of the
profile fields already exist and stay nullable/optional, they're just no
longer asked for up front.

Revision ID: 0022_date_of_birth
Revises: 0021_withdraw_completed_status
Create Date: 2026-08-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0022_date_of_birth"
down_revision: Union[str, None] = "0021_withdraw_completed_status"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("date_of_birth", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "date_of_birth")
