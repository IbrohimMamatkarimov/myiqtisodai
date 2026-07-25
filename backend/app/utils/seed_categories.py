"""Run with: python -m app.utils.seed_categories <user_id>
Seeds a sensible set of default categories for a newly registered user.
"""
import sys
import uuid

from app.db.session import SessionLocal
from app.models.category import Category, CategoryType

DEFAULT_EXPENSE_CATEGORIES = [
    ("Groceries", "shopping-cart", "#22C55E"),
    ("Rent & Utilities", "home", "#3B82F6"),
    ("Transport", "car", "#F59E0B"),
    ("Dining Out", "utensils", "#EF4444"),
    ("Health", "heart-pulse", "#EC4899"),
    ("Education", "book-open", "#8B5CF6"),
    ("Entertainment", "film", "#06B6D4"),
    ("Shopping", "shopping-bag", "#F97316"),
    ("Other", "more-horizontal", "#64748B"),
]

DEFAULT_INCOME_CATEGORIES = [
    ("Salary", "briefcase", "#22C55E"),
    ("Freelance", "laptop", "#3B82F6"),
    ("Gift", "gift", "#EC4899"),
    ("Other Income", "more-horizontal", "#64748B"),
]


def seed_default_categories(user_id: uuid.UUID) -> None:
    db = SessionLocal()
    try:
        for name, icon, color in DEFAULT_EXPENSE_CATEGORIES:
            db.add(Category(user_id=user_id, name=name, icon=icon, color=color, type=CategoryType.expense, is_default=True))
        for name, icon, color in DEFAULT_INCOME_CATEGORIES:
            db.add(Category(user_id=user_id, name=name, icon=icon, color=color, type=CategoryType.income, is_default=True))
        db.commit()
        print(f"Seeded default categories for user {user_id}")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python -m app.utils.seed_categories <user_id>")
        sys.exit(1)
    seed_default_categories(uuid.UUID(sys.argv[1]))
