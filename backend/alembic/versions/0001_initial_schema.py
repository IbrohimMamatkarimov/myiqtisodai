"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels = None
depends_on = None

language_enum = postgresql.ENUM("uz", "en", "ru", name="language", create_type=False)
theme_enum = postgresql.ENUM("light", "dark", name="theme", create_type=False)
currency_enum = postgresql.ENUM("UZS", "USD", "EUR", name="currency", create_type=False)
category_type_enum = postgresql.ENUM("income", "expense", name="categorytype", create_type=False)
recurrence_enum = postgresql.ENUM("none", "daily", "weekly", "monthly", "yearly", name="recurrenceinterval", create_type=False)
budget_period_enum = postgresql.ENUM("weekly", "monthly", "yearly", name="budgetperiod", create_type=False)
notification_type_enum = postgresql.ENUM(
    "budget_alert", "overspending", "goal_reminder", "monthly_summary", "system", name="notificationtype", create_type=False
)


def upgrade() -> None:
    bind = op.get_bind()
    language_enum.create(bind, checkfirst=True)
    theme_enum.create(bind, checkfirst=True)
    currency_enum.create(bind, checkfirst=True)
    category_type_enum.create(bind, checkfirst=True)
    recurrence_enum.create(bind, checkfirst=True)
    budget_period_enum.create(bind, checkfirst=True)
    notification_type_enum.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true()),
        sa.Column("is_email_verified", sa.Boolean(), server_default=sa.false()),
        sa.Column("is_superuser", sa.Boolean(), server_default=sa.false()),
        sa.Column("language", language_enum, server_default="uz"),
        sa.Column("theme", theme_enum, server_default="light"),
        sa.Column("currency", currency_enum, server_default="UZS"),
        sa.Column("notifications_enabled", sa.Boolean(), server_default=sa.true()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("categories.id", ondelete="CASCADE"), nullable=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("icon", sa.String(64), nullable=True),
        sa.Column("color", sa.String(16), nullable=True),
        sa.Column("type", category_type_enum, nullable=False),
        sa.Column("is_default", sa.Boolean(), server_default=sa.false()),
    )
    op.create_index("ix_categories_user_id", "categories", ["user_id"])
    op.create_index("ix_categories_parent_id", "categories", ["parent_id"])

    op.create_table(
        "incomes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("source_name", sa.String(160), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.String(8), server_default="UZS"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("income_date", sa.Date(), nullable=False),
        sa.Column("is_recurring", sa.Boolean(), server_default=sa.false()),
        sa.Column("recurrence_interval", recurrence_enum, server_default="none"),
    )
    op.create_index("ix_incomes_user_id", "incomes", ["user_id"])
    op.create_index("ix_incomes_category_id", "incomes", ["category_id"])
    op.create_index("ix_incomes_income_date", "incomes", ["income_date"])

    op.create_table(
        "expenses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.String(8), server_default="UZS"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("expense_date", sa.Date(), nullable=False),
        sa.Column("is_recurring", sa.Boolean(), server_default=sa.false()),
        sa.Column("recurrence_interval", recurrence_enum, server_default="none"),
    )
    op.create_index("ix_expenses_user_id", "expenses", ["user_id"])
    op.create_index("ix_expenses_category_id", "expenses", ["category_id"])
    op.create_index("ix_expenses_expense_date", "expenses", ["expense_date"])

    op.create_table(
        "budgets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("categories.id", ondelete="CASCADE"), nullable=True),
        sa.Column("limit_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("period", budget_period_enum, server_default="monthly"),
        sa.Column("alert_threshold_percent", sa.Integer(), server_default="80"),
    )
    op.create_index("ix_budgets_user_id", "budgets", ["user_id"])
    op.create_index("ix_budgets_category_id", "budgets", ["category_id"])

    op.create_table(
        "goals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("target_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("current_amount", sa.Numeric(14, 2), server_default="0"),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column("icon", sa.String(64), nullable=True),
        sa.Column("is_completed", sa.Boolean(), server_default=sa.false()),
    )
    op.create_index("ix_goals_user_id", "goals", ["user_id"])

    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", notification_type_enum, nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), server_default=sa.false()),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])

    op.create_table(
        "ai_conversations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
    )
    op.create_index("ix_ai_conversations_user_id", "ai_conversations", ["user_id"])

    op.create_table(
        "market_queries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("query_text", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
    )
    op.create_index("ix_market_queries_user_id", "market_queries", ["user_id"])


def downgrade() -> None:
    op.drop_table("market_queries")
    op.drop_table("ai_conversations")
    op.drop_table("notifications")
    op.drop_table("goals")
    op.drop_table("budgets")
    op.drop_table("expenses")
    op.drop_table("incomes")
    op.drop_table("categories")
    op.drop_table("users")

    bind = op.get_bind()
    notification_type_enum.drop(bind, checkfirst=True)
    budget_period_enum.drop(bind, checkfirst=True)
    recurrence_enum.drop(bind, checkfirst=True)
    category_type_enum.drop(bind, checkfirst=True)
    currency_enum.drop(bind, checkfirst=True)
    theme_enum.drop(bind, checkfirst=True)
    language_enum.drop(bind, checkfirst=True)
