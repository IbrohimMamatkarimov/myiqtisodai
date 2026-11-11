"""AI financial assistant.

Builds a compact snapshot of the user's own financial data (income, expenses,
budgets, goals) and sends it to Gemini alongside the user's question, so answers
are grounded in the user's real numbers rather than generic advice.
"""
import json
import logging
from datetime import date, timedelta
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.budget import Budget
from app.models.expense import Expense
from app.models.goal import Goal
from app.models.income import Income
from app.models.user import User

logger = logging.getLogger("myiqtisod.ai")


def ask_gemini(system_prompt: str, user_prompt: str, max_tokens: int) -> str | None:
    """Bound each provider attempt and fail over without logging private prompts."""
    if not settings.GEMINI_API_KEY:
        return None

    models = list(dict.fromkeys([
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
    ]))
    for model in models:
        payload = {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": max(1024, max_tokens),
                "thinkingConfig": {"thinkingLevel": "minimal"},
            },
        }
        request = Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "x-goog-api-key": settings.GEMINI_API_KEY},
            method="POST",
        )
        try:
            with urlopen(request, timeout=6) as response:
                data = json.loads(response.read().decode("utf-8"))
            parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
            answer = "".join(part.get("text", "") for part in parts if not part.get("thought")).strip()
            if answer:
                return answer
            logger.warning("Gemini returned no answer: model=%s", model)
        except HTTPError as error:
            logger.warning("Gemini request failed: model=%s status=%s", model, error.code)
            if error.code not in (404, 408, 429, 500, 502, 503, 504):
                return None
        except (TimeoutError, URLError, OSError, KeyError, IndexError, TypeError, ValueError):
            logger.warning("Gemini response unavailable: model=%s", model)
    return None


SYSTEM_PROMPT = """You are the IqtisodAI financial assistant, embedded in a personal
finance app used in Uzbekistan. You answer using ONLY the financial snapshot data given
to you plus general, safe financial literacy knowledge. Be concise, practical, and
specific to the numbers provided. Never invent transactions the user didn't report.
If data is insufficient to answer precisely, say so and explain what's missing.
Respond in the same language the user's question is written in (Uzbek, Russian, or
English), unless the user's message explicitly instructs a different response language.
Do not give regulated investment or tax advice; suggest consulting a professional for
those topics.

The snapshot includes the user's stated financial goal (e.g. buy_house, invest,
emergency_fund, debt_free) and occupation when known. Actively tailor your advice
toward that specific goal rather than giving generic tips - e.g. for buy_house or
buy_car, frame savings suggestions around reaching that target amount faster; for
invest, mention building a habit of setting aside a fixed amount before spending;
for debt_free, prioritize suggestions that free up cash for debt paydown."""


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
        db.query(Expense).filter(Expense.user_id == user.id, Expense.expense_date >= last_30)
        .order_by(Expense.expense_date.desc()).limit(20).all()
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
    if user.financial_goal:
        lines.append(f"User's stated primary financial goal: {user.financial_goal.value}")
    if user.occupation:
        lines.append(f"User's occupation: {user.occupation}")
    if user.monthly_income:
        lines.append(f"User's reported typical monthly income: {user.monthly_income}")
    if user.spending_habits:
        habits = ", ".join(f"{k}: {v}" for k, v in user.spending_habits.items() if v)
        if habits:
            lines.append(f"User's self-reported typical monthly spending habits: {habits}")
    for goal in goals[:5]:
        lines.append(f"  Goal '{goal.title}': {goal.current_amount}/{goal.target_amount} (deadline: {goal.deadline})")
    lines.append(f"Last 30 days transaction count: {len(recent_expenses)}")
    for expense in recent_expenses[:15]:
        lines.append(f"  {expense.expense_date}: {expense.amount} {expense.currency} - {expense.description or 'no description'}")
    return "\n".join(lines)


def ask_financial_assistant(db: Session, user: User, question: str) -> str:
    if not settings.GEMINI_API_KEY:
        return "The AI assistant isn't configured yet. Add a GEMINI_API_KEY in the backend environment to enable AI-powered answers."

    answer = ask_gemini(
        SYSTEM_PROMPT,
        f"My financial snapshot:\n{_build_financial_snapshot(db, user)}\n\nMy question: {question}",
        max_tokens=700,
    )
    if not answer:
        messages = {
            "uz": "Hozir javob olinmadi. Savolingizni qayta yuborib ko‘ring.",
            "en": "We could not get a reply right now. Please try your question again.",
            "ru": "Сейчас не удалось получить ответ. Попробуйте отправить вопрос ещё раз.",
        }
        raise HTTPException(status_code=503, detail=messages.get(user.language.value, messages["uz"]))
    return answer
