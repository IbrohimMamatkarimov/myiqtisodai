import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger("myiqtisod.email")


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an email via SMTP. Returns True on success, False otherwise.

    In development (no SMTP configured), logs the email instead of sending it,
    so auth flows are still testable without real credentials.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.info("SMTP not configured. Would send email to %s: %s\n%s", to_email, subject, html_body)
        return True

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


def send_verification_email(to_email: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    send_email(
        to_email,
        "Verify your MyIqtisod account",
        f"<p>Welcome to MyIqtisod! Please verify your email by clicking "
        f"<a href='{link}'>this link</a>. It expires in 24 hours.</p>",
    )


def send_password_reset_email(to_email: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    send_email(
        to_email,
        "Reset your MyIqtisod password",
        f"<p>We received a request to reset your password. Click "
        f"<a href='{link}'>this link</a> to set a new one. If you didn't request this, ignore this email.</p>",
    )
