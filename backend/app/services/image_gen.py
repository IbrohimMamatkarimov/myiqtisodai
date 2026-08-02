import hashlib
import logging
import urllib.parse

logger = logging.getLogger("myiqtisod.image_gen")

# Free, no-API-key image generation (Flux model) via https://pollinations.ai.
# Anonymous requests are rate-limited (roughly 1 per 15s) with no uptime
# guarantee - fine for a personal finance app generating one image per goal
# or manually-entered expense, not meant for high-volume production traffic.
# If this ever needs to be more reliable, swap this file for a paid provider
# (OpenAI images, Stability, etc) - everything else that calls this module
# only cares about getting a URL (or None) back, so the swap is contained here.
POLLINATIONS_BASE = "https://image.pollinations.ai/prompt"


def _craft_prompt(subject: str, style_hint: str) -> str:
    """Turns a short user-entered title (often just a couple words, in Uzbek,
    Russian, or English) into a fuller prompt so the image model has enough
    to work with."""
    return f"{subject.strip()}, {style_hint}, no text, no watermark, no logos"


def generate_image_url(subject: str, kind: str = "goal") -> str | None:
    """Returns a Pollinations.ai URL that renders an AI-generated image for the
    given subject (a goal title, or an expense's description/merchant name).
    Best-effort: returns None on any failure so callers can treat this as
    optional and never let it block saving a goal/expense."""
    if not subject or not subject.strip():
        return None

    try:
        style_hint = (
            "professional product photography, clean minimal background, soft studio lighting"
            if kind == "expense"
            else "vibrant editorial photo, warm natural lighting, aspirational mood"
        )
        prompt = _craft_prompt(subject, style_hint)
        encoded = urllib.parse.quote(prompt)

        # A stable seed derived from the subject means the same title always
        # renders the same image, instead of a new random one on every reload.
        seed = int(hashlib.sha256(subject.encode("utf-8")).hexdigest(), 16) % (10**8)

        return (
            f"{POLLINATIONS_BASE}/{encoded}"
            f"?width=512&height=512&seed={seed}&nologo=true&model=flux"
        )
    except Exception:
        logger.exception("Failed to build AI image URL for subject: %s", subject)
        return None
