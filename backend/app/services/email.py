import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger("myiqtisod.email")


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an email via SMTP. Returns True on success, False otherwise.

    In development (no SMTP configured, or still using the placeholder
    values from .env.example), logs the email instead of trying to send it,
    so auth flows are still testable without real credentials. Without this
    check, placeholder values like "your-email@gmail.com" look "configured"
    (they're non-empty strings), so the code would try a real SMTP login,
    fail authentication, and silently swallow the error below - which is
    exactly why reset/verification emails were never arriving.
    """
    looks_like_placeholder = (
        not settings.SMTP_USER
        or not settings.SMTP_PASSWORD
        or "your-email" in settings.SMTP_USER
        or "your-app-password" in settings.SMTP_PASSWORD
    )
    if looks_like_placeholder:
        logger.info(
            "SMTP not configured (or still has placeholder .env values). "
            "Would send email to %s: %s\n%s",
            to_email,
            subject,
            html_body,
        )
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAIL_FROM, to_email, msg.as_string())
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to_email)
        return False


def send_verification_email(to_email: str, token: str) -> str:
    link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    sent = send_email(
        to_email,
        "Verify your MyIqtisod account",
        f"<p>Welcome to MyIqtisod! Please verify your email by clicking "
        f"<a href='{link}'>this link</a>. It expires in 24 hours.</p>",
    )
    if settings.DEBUG and not sent:
        logger.info("\n%s\nDEV MODE - verification link for %s:\n%s\n%s", "=" * 60, to_email, link, "=" * 60)
    return link


def send_password_reset_email(to_email: str, token: str) -> str:
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    sent = send_email(
        to_email,
        "Reset your MyIqtisod password",
        f"<p>We received a request to reset your password. Click "
        f"<a href='{link}'>this link</a> to set a new one. If you didn't request this, ignore this email.</p>",
    )
    if settings.DEBUG and not sent:
        logger.info("\n%s\nDEV MODE - password reset link for %s:\n%s\n%s", "=" * 60, to_email, link, "=" * 60)
    return link
