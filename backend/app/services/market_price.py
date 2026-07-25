"""Market price assistant.

Currently answers using the LLM's general knowledge with a strong disclaimer,
since Uzbekistan doesn't have one single authoritative public price API. The
function signature is designed so a real data source can be dropped in later
without changing callers: fetch_market_data(query) -> structured facts, then
pass those facts to the LLM instead of relying on its own knowledge.
"""
import logging

from groq import Groq

from app.core.config import settings

logger = logging.getLogger("myiqtisod.market")

SYSTEM_PROMPT = """You are a market price assistant for users in Uzbekistan. Answer
questions about typical prices (groceries, electronics, rent, etc.) using your general
knowledge, clearly stating these are rough estimates, not live prices, since you have no
real-time data feed connected. Prefer giving a plausible range rather than one number.
Keep answers short. Respond in the same language as the question."""


def fetch_market_data(query: str) -> str | None:
    """Placeholder hook for a future real market-data integration (e.g. a
    local e-commerce API, a statistics agency feed, or a scraper service).
    Return None to fall back to the LLM's general knowledge.
    """
    return None


def ask_market_assistant(query: str) -> str:
    if not settings.GROQ_API_KEY:
        return (
            "The market price assistant isn't configured yet. Add a GROQ_API_KEY in the "
            "backend .env file to enable it."
        )

    live_data = fetch_market_data(query)
    context = f"Live market data: {live_data}" if live_data else "No live data source connected yet."

    client = Groq(api_key=settings.GROQ_API_KEY)
    try:
        completion = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"{context}\n\nQuestion: {query}"},
            ],
            temperature=0.3,
            max_tokens=400,
        )
        return completion.choices[0].message.content
    except Exception:
        logger.exception("Groq API call failed (market assistant)")
        return "Sorry, the market price assistant is temporarily unavailable."
