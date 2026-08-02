"""Real, curated stock photos for goal cover images, via Pexels' free API.

Why Pexels instead of the old approach: this used to call an anonymous,
unmoderated AI image generator (Pollinations.ai) which produced unpredictable
and sometimes wildly inappropriate images for ordinary titles - see
app/services/image_gen.py (deprecated) for the full story. Pexels is a real
curated stock-photo library with actual moderation, so results are
predictable and safe - the tradeoff is it can only return photos that
actually exist in their library, matched by keyword, not "whatever the
title literally says."

Goal titles are often short, non-English (Uzbek/Russian), and not phrased
as a photo-search query ("Yangi noutbuk" = "New laptop"), so a raw title
search on Pexels would frequently return nothing useful. _guess_query() maps
common goal categories (in Uzbek, Russian, and English) to a clean English
search term Pexels actually understands well, and only falls back to the
raw title if nothing matches.
"""
import logging
import re

import httpx

from app.core.config import settings

logger = logging.getLogger("myiqtisod.stock_photos")

PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search"

# (keyword pattern, safe English search query) - checked in order, first
# match wins. Add more as real goal titles reveal gaps.
_CATEGORY_MAP: list[tuple[re.Pattern, str]] = [
    (re.compile(r"noutbuk|laptop|ноутбук|kompyuter|computer|компьютер", re.I), "laptop computer flatlay minimal desk"),
    (re.compile(r"telefon|phone|телефон|smartfon|iphone|smartphone", re.I), "smartphone flatlay minimal"),
    (re.compile(r"sayohat|travel|trip|dam olish|otdix|поездка|путешествие|vacation|holiday", re.I), "beach ocean scenic landscape"),
    (re.compile(r"mashina|avto|car|avtomobil|машина|автомобиль", re.I), "car exterior road scenic"),
    (re.compile(r"\buy\b|dom|house|kvartira|apartment|дом|квартира|home", re.I), "house exterior architecture"),
    (re.compile(r"to'y|toy|wedding|свадьба", re.I), "wedding rings flowers"),
    (re.compile(r"talim|ta'lim|education|study|o'qish|kurs|course|образование|курс|учеба", re.I), "books stack study desk"),
    (re.compile(r"sog'liq|salomatlik|health|здоровье", re.I), "fitness wellness gym"),
    (re.compile(r"zaxira|jamg'arma|emergency|fund|запас|подушка", re.I), "piggy bank coins savings"),
    (re.compile(r"biznes|business|бизнес|startup", re.I), "office desk workspace minimal"),
    (re.compile(r"sovg'a|gift|present|подарок", re.I), "gift box wrapped present"),
    (re.compile(r"velosiped|bicycle|велосипед|bike", re.I), "bicycle outdoor scenic"),
    (re.compile(r"kiyim|clothes|kiyim-kechak|одежда|fashion", re.I), "clothing flatlay minimal"),
]


def _guess_query(title: str) -> str:
    for pattern, query in _CATEGORY_MAP:
        if pattern.search(title):
            return query
    return title


def get_goal_cover_photo(title: str) -> str | None:
    """Returns a real Pexels photo URL matching the goal title, or None if
    no key is configured, no good match was found, or the request failed -
    callers should treat this as fully optional and never block on it."""
    if not settings.PEXELS_API_KEY or not title or not title.strip():
        return None

    query = _guess_query(title.strip())

    try:
        response = httpx.get(
            PEXELS_SEARCH_URL,
            headers={"Authorization": settings.PEXELS_API_KEY},
            params={"query": query, "per_page": 1, "orientation": "landscape"},
            timeout=10,
        )
        if response.status_code != 200:
            logger.warning("Pexels search failed for %r (query %r): %s", title, query, response.status_code)
            return None

        photos = response.json().get("photos") or []
        if not photos:
            logger.info("No Pexels results for %r (query %r)", title, query)
            return None

        return photos[0]["src"]["medium"]
    except Exception:
        logger.exception("Pexels request failed for %r", title)
        return None
