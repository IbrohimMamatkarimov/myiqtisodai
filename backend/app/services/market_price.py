"""Market price assistant."""
from app.core.config import settings
from app.services.ai_assistant import ask_gemini

SYSTEM_PROMPT = """You are a market price assistant for users in Uzbekistan. Answer
questions about typical prices (groceries, electronics, rent, etc.) using your general
knowledge, clearly stating these are rough estimates, not live prices, since you have no
real-time data feed connected. Prefer giving a plausible range rather than one number.
Keep answers short. Respond in the same language as the question."""


def fetch_market_data(query: str) -> str | None:
    return None


def ask_market_assistant(query: str) -> str:
    if not settings.GEMINI_API_KEY:
        return "The market price assistant isn't configured yet. Add a GEMINI_API_KEY in the backend environment to enable it."

    live_data = fetch_market_data(query)
    context = f"Live market data: {live_data}" if live_data else "No live data source connected yet."
    answer = ask_gemini(SYSTEM_PROMPT, f"{context}\n\nQuestion: {query}", max_tokens=400)
    return answer or "Sorry, the market price assistant is temporarily unavailable."
