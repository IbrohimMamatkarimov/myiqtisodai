"""AI financial assistant.

Builds a compact snapshot of the user's own financial data (income, expenses,
budgets, goals) and sends it to Groq's LLM API alongside the user's question,
so answers are grounded in the user's real numbers rather than generic advice.
"""
import logging
from datetime import date, timedelta

from groq import Groq
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.budget import Budget
from app.models.expense import Expense
from app.models.goal import Goal
from app.models.income import Income
from app.models.user import User

logger = logging.getLogger("myiqtisod.ai")

SYSTEM_PROMPT = """You are the MyIqtisod AI financial assistant, embedded in a personal
finance app used in Uzbekistan. You answer using ONLY the financial snapshot data given
to you plus general, safe financial literacy knowledge. Be concise, practical, and
specific to the numbers provided. Never invent transactions the user didn't report.
If data is insufficient to answer precisely, say so and explain what's missing.
Respond in the same language the user's question is written in (Uzbek, Russian, or
English). Do not give regulated investment or tax advice; suggest consulting a
professional for those topics."""


def _build_financial_snapshot(db: Session, user: User) -> str:
    today = date.today()
    month_start = today.replace(day=1)
    last_30 = today - timedelta(days=30)

    total_income = db.query(func.coalesce(func.sum(Income.amount), 0)).filter(
        Income.user_id == user.id, Income.income_date >= month_start
    ).scalar()

    total_expenses = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
        Expense.user_id == user.id, Expense.expense_date >= month_start
    ).scalar()

    recent_expenses = (
        db.query(Expense)
        .filter(Expense.user_id == user.id, Expense.expense_date >= last_30)
        .order_by(Expense.expense_date.desc())
        .limit(20)
        .all()
    )

    goals = db.query(Goal).filter(Goal.user_id == user.id, Goal.is_completed.is_(False)).all()
    budgets = db.query(Budget).filter(Budget.user_id == user.id).all()

    lines = [
        f"Currency: {user.currency.value}",
        f"This month's income so far: {total_income}",
        f"This month's expenses so far: {total_expenses}",
        f"Remaining balance this month: {float(total_income) - float(total_expenses)}",
        f"Number of budgets configured: {len(budgets)}",
        f"Active savings goals: {len(goals)}",
    ]
    for g in goals[:5]:
        lines.append(f"  Goal '{g.title}': {g.current_amount}/{g.target_amount} (deadline: {g.deadline})")
    lines.append(f"Last 30 days transaction count: {len(recent_expenses)}")
    for e in recent_expenses[:15]:
        lines.append(f"  {e.expense_date}: {e.amount} {e.currency} - {e.description or 'no description'}")

    return "\n".join(lines)


def ask_financial_assistant(db: Session, user: User, question: str) -> str:
    if not settings.GROQ_API_KEY:
        return (
            "The AI assistant isn't configured yet. Add a GROQ_API_KEY in the backend "
            ".env file to enable AI-powered answers."
        )

    snapshot = _build_financial_snapshot(db, user)

    client = Groq(api_key=settings.GROQ_API_KEY)
    try:
        completion = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"My financial snapshot:\n{snapshot}\n\nMy question: {question}",
                },
            ],
            temperature=0.4,
            max_tokens=700,
        )
        return completion.choices[0].message.content
    except Exception:
        logger.exception("Groq API call failed")
        return "Sorry, the AI assistant is temporarily unavailable. Please try again shortly."
