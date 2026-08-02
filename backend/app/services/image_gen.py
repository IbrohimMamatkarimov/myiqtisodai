"""DEPRECATED - do not use.

This used to auto-generate a "cover photo" per goal/expense title via
Pollinations.ai, a free, anonymous, unmoderated text-to-image API (no content
filtering at all). It produced unpredictable and sometimes wildly
inappropriate/irrelevant images for ordinary titles - removed from
goals.py and expenses.py for that reason. Left here (unused) instead of
deleted so the history/reasoning isn't lost, but nothing should import
generate_image_url from this file again. If cover images are wanted in the
future, use a real moderated provider (e.g. OpenAI Images with its built-in
safety filtering) instead of an anonymous unmoderated endpoint.
"""
