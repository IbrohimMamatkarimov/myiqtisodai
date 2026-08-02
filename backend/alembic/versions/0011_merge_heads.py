"""merge heads

Two migrations were created independently off the same parent
(0009_admin_dashboard): 0010_clear_generated_images and
1741b907d593_add_ai_image_columns. This merges them back into a single
history - no schema/data changes here, just resolves the fork so
`alembic upgrade head` has one unambiguous target again.

Revision ID: 0011_merge_heads
Revises: 0010_clear_generated_images, 1741b907d593
Create Date: 2026-08-03

"""
from typing import Sequence, Union

revision: str = "0011_merge_heads"
down_revision: Union[str, None] = ("0010_clear_generated_images", "1741b907d593")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
