import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx

from app.core.config import settings

logger = logging.getLogger("myiqtisod.email")


def _send_via_brevo(to_email: str, subject: str, html_body: str) -> bool:
    """Send via Brevo's HTTPS API (https://api.brevo.com/v3/smtp/email).

    Uses plain HTTPS (port 443), not SMTP ports - this is what makes it work
    on hosts like Render's free tier, which blocks outbound SMTP ports
    25/465/587 but not regular HTTPS traffic.
    """
    try:
        response = httpx.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "api-key": settings.BREVO_API_KEY,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json={
                "sender": {"email": settings.EMAIL_FROM},
                "to": [{"email": to_email}],
                "subject": subject,
                "htmlContent": html_body,
            },
            timeout=15,
        )
        if response.status_code >= 400:
            logger.error(
                "Brevo API error sending to %s: %s %s",
                to_email,
                response.status_code,
                response.text,
            )
            return False
        return True
    except Exception:
        logger.exception("Brevo API request failed for %s", to_email)
        return False


def _send_via_smtp(to_email: str, subject: str, html_body: str) -> bool:
    """Legacy direct-SMTP path. Works fine on your own machine, but will hang
    or fail on hosts that block outbound SMTP ports (e.g. Render free tier) -
    kept as a local-dev fallback only."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAIL_FROM, to_email, msg.as_string())
        return True
    except Exception:
        logger.exception("Failed to send email (SMTP) to %s", to_email)
        return False


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an email. Returns True on success, False otherwise.

    Prefers Brevo's HTTPS API when BREVO_API_KEY is configured (works
    everywhere, including hosts that block SMTP ports). Falls back to direct
    SMTP if no Brevo key is set - fine for local dev, but will hang/fail on
    hosts like Render's free tier.

    In development with neither configured (or still using placeholder .env
    values), logs the email instead of trying to send it, so auth flows are
    still testable without real credentials.
    """
    if settings.BREVO_API_KEY:
        return _send_via_brevo(to_email, subject, html_body)

    looks_like_placeholder = (
        not settings.SMTP_USER
        or not settings.SMTP_PASSWORD
        or "your-email" in settings.SMTP_USER
        or "your-app-password" in settings.SMTP_PASSWORD
    )
    if looks_like_placeholder:
        logger.info(
            "No email provider configured (no BREVO_API_KEY, and SMTP is unset "
            "or still has placeholder .env values). Would send email to %s: %s\n%s",
            to_email,
            subject,
            html_body,
        )
        return False

    return _send_via_smtp(to_email, subject, html_body)


def send_verification_email(to_email: str, token: str) -> str | None:
    """Sends the verification email. Returns the link ONLY when the real send
    failed (so callers can surface a dev-mode fallback) - returns None on a
    genuine successful send, so the dev link never leaks into API responses
    for emails that actually went out."""
    link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    sent = send_email(
        to_email,
        "Verify your MyIqtisod account",
        f"<p>Welcome to MyIqtisod! Please verify your email by clicking "
        f"<a href='{link}'>this link</a>. It expires in 24 hours.</p>",
    )
    if sent:
        return None
    if settings.DEBUG:
        logger.info("\n%s\nDEV MODE - verification link for %s:\n%s\n%s", "=" * 60, to_email, link, "=" * 60)
        return link
    return None


def send_password_reset_email(to_email: str, token: str) -> str | None:
    """Sends the reset email. Returns the link ONLY when the real send
    failed (so callers can surface a dev-mode fallback) - returns None on a
    genuine successful send, so the dev link never leaks into API responses
    for emails that actually went out."""
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    sent = send_email(
        to_email,
        "Reset your MyIqtisod password",
        f"<p>We received a request to reset your password. Click "
        f"<a href='{link}'>this link</a> to set a new one. If you didn't request this, ignore this email.</p>",
    )
    if sent:
        return None
    if settings.DEBUG:
        logger.info("\n%s\nDEV MODE - password reset link for %s:\n%s\n%s", "=" * 60, to_email, link, "=" * 60)
        return link
    return None
