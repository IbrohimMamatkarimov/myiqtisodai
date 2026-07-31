"""onboarding fields

Revision ID: 0002_onboarding
Revises: 0001_initial
Create Date: 2026-07-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0002_onboarding"
down_revision: Union[str, None] = "0001_initial"
branch_labels = None
depends_on = None

gender_enum = postgresql.ENUM(
    "male", "female", "other", "prefer_not_to_say", name="gender", create_type=False
)
financial_goal_enum = postgresql.ENUM(
    "save_money", "reduce_spending", "emergency_fund", "buy_house", "buy_car",
    "travel", "education", "invest", "debt_free", "other",
    name="financialgoal", create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    gender_enum.create(bind, checkfirst=True)
    financial_goal_enum.create(bind, checkfirst=True)

    # These existed on the SQLAlchemy model already, but the initial
    # migration never created them on the users table.
    op.add_column("users", sa.Column("age", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("country", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("occupation", sa.String(150), nullable=True))
    op.add_column("users", sa.Column("monthly_income", sa.Numeric(12, 2), nullable=True))
    op.add_column("users", sa.Column("salary_day", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("financial_goal", financial_goal_enum, nullable=True))
    op.add_column(
        "users",
        sa.Column("onboarding_completed", sa.Boolean(), server_default=sa.false(), nullable=False),
    )

    # New in Phase 1
    op.add_column("users", sa.Column("gender", gender_enum, nullable=True))
    op.add_column("users", sa.Column("spending_habits", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "spending_habits")
    op.drop_column("users", "gender")
    op.drop_column("users", "onboarding_completed")
    op.drop_column("users", "financial_goal")
    op.drop_column("users", "salary_day")
    op.drop_column("users", "monthly_income")
    op.drop_column("users", "occupation")
    op.drop_column("users", "country")
    op.drop_column("users", "age")

    bind = op.get_bind()
    financial_goal_enum.drop(bind, checkfirst=True)
    gender_enum.drop(bind, checkfirst=True)
