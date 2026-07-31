"""widen monthly_income precision

Revision ID: 0004_income_precision
Revises: 0003_budgets_fix
Create Date: 2026-07-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004_income_precision"
down_revision: Union[str, None] = "0003_budgets_fix"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 12,2 only allowed 10 integer digits and could overflow with a
    # 500 error on legitimate large inputs. 14,2 gives headroom.
    op.alter_column(
        "users",
        "monthly_income",
        type_=sa.Numeric(14, 2),
        existing_type=sa.Numeric(12, 2),
    )


def downgrade() -> None:
    op.alter_column(
        "users",
        "monthly_income",
        type_=sa.Numeric(12, 2),
        existing_type=sa.Numeric(14, 2),
    )
