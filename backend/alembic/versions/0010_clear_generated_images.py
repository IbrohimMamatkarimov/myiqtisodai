"""clear ai-generated goal/expense images

The previously-stored image_url/ai_image_url values came from an unmoderated,
anonymous AI image generator (see app/services/image_gen.py, now deprecated)
that could produce unpredictable, irrelevant, or inappropriate images for
ordinary titles. Clearing all previously-generated values rather than leaving
stale bad images in place; the app no longer generates new ones.

Revision ID: 0010_clear_generated_images
Revises: 0009_admin_dashboard
Create Date: 2026-08-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0010_clear_generated_images"
down_revision: Union[str, None] = "0009_admin_dashboard"
branch_labels = None
# This migration nulls out expenses.ai_image_url, a column only created by
# 1741b907d593 (an independent branch off the same 0009 parent) - depends_on
# forces that migration to run first regardless of branch traversal order,
# so this never runs against a DB that doesn't have the column yet.
depends_on = "1741b907d593"


def upgrade() -> None:
    op.execute(sa.text("UPDATE goals SET image_url = NULL"))
    op.execute(sa.text("UPDATE expenses SET ai_image_url = NULL"))


def downgrade() -> None:
    # Not reversible - the original AI-generated URLs aren't recoverable.
    pass
