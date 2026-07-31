"""Receipt scanner service (Phase 3).

Sends a photographed/uploaded receipt image straight to a Groq vision-capable
model and asks it to return structured JSON. This skips a separate OCR step -
modern vision LLMs read receipt text directly - which avoids needing a local
OCR toolchain (e.g. Tesseract) installed on the developer's machine.
"""
import base64
import io
import json
import logging
import time
from datetime import date

from groq import Groq, RateLimitError
from PIL import Image

from app.core.config import settings

logger = logging.getLogger("myiqtisod.receipt_scanner")

# Groq's vision-capable lineup changes over time; qwen/qwen3.6-27b is the
# current production vision model (llama-4-scout was deprecated by Groq in
# June 2026, and qwen3.6-27b is their official recommended replacement).
# If scanning stops working, check https://console.groq.com/docs/vision.
VISION_MODEL = "qwen/qwen3.6-27b"

SYSTEM_PROMPT = """You extract structured data from photos of purchase receipts for a
personal finance app. Read the receipt image carefully and return ONLY a JSON object
(no markdown, no commentary) with exactly these keys:

{
  "merchant_name": string or null,
  "expense_date": "YYYY-MM-DD" or null,
  "receipt_time": "HH:MM" or null,
  "amount": number or null,           // the final total actually paid
  "currency": string or null,         // ISO-like code, e.g. "UZS", "USD", "EUR"
  "category_name": string or null,    // your best guess, pick the single closest match from the category list given below
  "products": [ { "name": string, "price": number or null } ],  // line items, best effort, [] if unreadable
  "tax_amount": number or null,
  "description": string or null       // one short human-readable summary, e.g. "Grocery shopping at Korzinka"
}

If the image is not a receipt at all, or is unreadable, still return the JSON object
with null values and a best-effort "description" explaining what you saw.

Do not include any reasoning, explanation, or <think> block before or after the JSON.
Respond with the JSON object only, as the very first character of your response."""


def _extract_json(text: str) -> dict:
    text = text.strip()

    # qwen3.6-27b has a "thinking" mode and may prepend a <think>...</think>
    # reasoning block before the actual answer - strip it if present. Naively
    # taking the first "{" to the last "}" in the whole response (the old
    # approach) breaks here, since the reasoning text itself often contains
    # stray braces.
    if "<think>" in text:
        if "</think>" in text:
            text = text.split("</think>", 1)[-1].strip()
        else:
            # Thinking block never closed (e.g. cut off by max_tokens) - there's no
            # JSON to recover from this response, but don't discard everything
            # silently; leave text as-is so the "{" search below still gets a
            # fair shot at anything that slipped out before/after the open tag,
            # and so callers get a clear "unbalanced JSON" error instead of a
            # misleading "no JSON object found" when reasoning text itself
            # happens to contain a brace.
            pass

    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()

    start = text.find("{")
    if start == -1:
        raise json.JSONDecodeError("No JSON object found in model output", text, 0)

    # Balanced-brace scan from the first "{" to find ITS true matching "}",
    # instead of assuming the last "}" in the whole string closes it (which
    # breaks if any stray brace-like text follows the real JSON object).
    depth = 0
    in_string = False
    escape = False
    end = None
    for i in range(start, len(text)):
        ch = text[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i
                break

    if end is None:
        raise json.JSONDecodeError("Unbalanced JSON object in model output", text, start)

    return json.loads(text[start : end + 1])


def _downscale_image(image_bytes: bytes, mime_type: str) -> tuple[bytes, str]:
    """Vision models charge tokens roughly by pixel count. A full-resolution phone
    photo (often 3000-4000px on the long edge) can burn through an entire per-minute
    token budget in a single request. Downscaling to a sane max dimension and
    re-encoding as JPEG keeps receipts perfectly readable at a fraction of the cost."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img = img.convert("RGB")
        max_dim = 1024
        if max(img.size) > max_dim:
            ratio = max_dim / max(img.size)
            new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
            img = img.resize(new_size, Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=82, optimize=True)
        return buf.getvalue(), "image/jpeg"
    except Exception:
        logger.exception("Failed to downscale receipt image; sending original")
        return image_bytes, mime_type


def scan_receipt(image_bytes: bytes, mime_type: str, category_names: list[str], language: str = "en") -> dict:
    """Returns a dict matching ReceiptScanResult's fields (minus category_id/receipt_image),
    plus a 'warning' key set when the AI call fails or the API key isn't configured.
    `language` is a UI locale code (uz/en/ru) - the free-text 'description' field the AI
    writes should come back in that language, not whatever the model defaults to."""

    empty_result = {
        "merchant_name": None,
        "expense_date": None,
        "receipt_time": None,
        "amount": None,
        "currency": None,
        "category_name": None,
        "products": [],
        "tax_amount": None,
        "description": None,
    }

    if not settings.GROQ_API_KEY:
        return {**empty_result, "warning": "AI scanning isn't configured (missing GROQ_API_KEY)."}

    image_bytes, mime_type = _downscale_image(image_bytes, mime_type)
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    data_url = f"data:{mime_type};base64,{b64}"

    category_hint = (
        f"Categories available in this user's account: {', '.join(category_names)}."
        if category_names
        else "No categories are set up yet for this user; suggest a sensible generic category name."
    )

    language_names = {"uz": "Uzbek", "en": "English", "ru": "Russian"}
    language_name = language_names.get(language, "English")
    language_hint = (
        f"Write the 'description' field in {language_name}, regardless of what "
        f"language the receipt itself is printed in. All other fields keep their "
        f"specified format (dates, numbers, currency codes)."
    )

    client = Groq(api_key=settings.GROQ_API_KEY, timeout=15.0, max_retries=0)

    def _call():
        return client.chat.completions.create(
            model=VISION_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"{category_hint}\n{language_hint}\n\nToday's date if needed for context: {date.today().isoformat()}.",
                        },
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                },
            ],
            temperature=0.2,
            max_tokens=3000,
            # qwen3.6-27b is a hybrid thinking/non-thinking model. The "/no_think"
            # text hack is unreliable - the model can still emit a <think> block
            # that eats the whole max_tokens budget, leaving no JSON at all (this
            # is what was actually happening). reasoning_effort="none" is Groq's
            # real API-level switch for turning thinking off on this model.
            # See https://console.groq.com/docs/reasoning
            reasoning_effort="none",
            response_format={"type": "json_object"},
        )

    try:
        try:
            completion = _call()
        except RateLimitError as e:
            # If Groq says the per-minute budget resets in just a few seconds, it's
            # worth one quiet retry rather than failing immediately - this is usually
            # the Dashboard's own background AI-insight call sharing the same
            # per-minute token budget moments earlier, not sustained heavy use.
            retry_after = None
            try:
                retry_after = float(e.response.headers.get("retry-after", ""))
            except (AttributeError, ValueError):
                pass
            if retry_after is not None and retry_after <= 12:
                logger.info("Rate limited; waiting %.1fs and retrying once", retry_after)
                time.sleep(retry_after + 0.5)
                completion = _call()
            else:
                raise

        raw = completion.choices[0].message.content
        parsed = _extract_json(raw)

        products = parsed.get("products") or []
        if not isinstance(products, list):
            products = []
        clean_products = []
        for p in products:
            if isinstance(p, dict) and p.get("name"):
                clean_products.append({"name": str(p["name"]), "price": p.get("price")})

        return {
            "merchant_name": parsed.get("merchant_name"),
            "expense_date": parsed.get("expense_date"),
            "receipt_time": parsed.get("receipt_time"),
            "amount": parsed.get("amount"),
            "currency": parsed.get("currency"),
            "category_name": parsed.get("category_name"),
            "products": clean_products,
            "tax_amount": parsed.get("tax_amount"),
            "description": parsed.get("description"),
            "warning": (
                "This doesn't look like a receipt. Please upload a photo of a receipt, "
                "or fill in the details manually."
                if parsed.get("amount") is None and parsed.get("merchant_name") is None and not clean_products
                else None
            ),
        }
    except json.JSONDecodeError:
        logger.exception("Receipt scanner returned non-JSON output")
        return {**empty_result, "warning": "Couldn't read the receipt clearly. Please fill in the details manually."}
    except RateLimitError as e:
        logger.warning("Groq rate limit hit during receipt scan")
        retry_after = None
        try:
            retry_after = float(e.response.headers.get("retry-after", ""))
        except (AttributeError, ValueError):
            pass
        if retry_after and retry_after > 0:
            seconds = max(1, round(retry_after))
            wait_msg = f"Wait about {seconds} second{'s' if seconds != 1 else ''} and try again"
        else:
            wait_msg = "Wait about a minute and try again"
        return {
            **empty_result,
            "warning": f"The AI scanner is getting a lot of use right now (rate limit). {wait_msg}, or fill in the details manually.",
        }
    except Exception:
        logger.exception("Groq vision API call failed for receipt scan")
        return {**empty_result, "warning": "The AI scanner is temporarily unavailable. Please fill in the details manually."}
