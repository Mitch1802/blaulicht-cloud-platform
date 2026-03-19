import logging
from urllib.parse import quote

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def _safe_frontend_base_url() -> str:
    return str(getattr(settings, "FRONTEND_URL", "")).strip().rstrip("/")


def build_invite_url(token: str) -> str:
    frontend_base_url = _safe_frontend_base_url()
    if not frontend_base_url:
        return ""
    return f"{frontend_base_url}/einladung?token={quote(token)}"


def send_account_invite_email(username: str, email: str, invite_url: str, first_name: str = "") -> bool:
    """
    Sendet eine Einladungs-E-Mail mit einmaligem Link zur Passwortvergabe.

    Returns True wenn die E-Mail erfolgreich gesendet wurde, sonst False.
    """
    if not email:
        logger.warning("Einladungs-E-Mail konnte nicht gesendet werden: keine E-Mail-Adresse für Benutzer '%s'.", username)
        return False

    if not invite_url:
        logger.warning("Einladungs-E-Mail konnte nicht gesendet werden: kein Invite-Link für Benutzer '%s'.", username)
        return False

    greeting = f"Hallo {first_name}," if first_name else "Hallo,"
    subject = "Einladung zur Blaulicht Cloud"
    message = (
        f"{greeting}\n\n"
        f"für dein Konto '{username}' wurde eine Einladung erstellt.\n"
        f"Bitte vergib dein Passwort über diesen Link:\n\n"
        f"{invite_url}\n\n"
        f"Hinweis: Der Link ist zeitlich begrenzt und nach der Passwortvergabe ungültig.\n\n"
        f"Mit freundlichen Grüßen\n"
        f"Dein Blaulicht Cloud Team"
    )

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        logger.info("Einladungs-E-Mail an '%s' gesendet.", email)
        return True
    except Exception:
        logger.exception("Fehler beim Senden der Einladungs-E-Mail an '%s'.", email)
        return False


def send_service_reminder_email(recipient_email: str, items: list[dict], fw_name: str = "", days: int = 30) -> bool:
    """
    Sendet eine Erinnerungs-E-Mail für bald fällige Services/Wartungen.

    ``items`` ist eine Liste von Dicts mit den Schlüsseln:
        - modul: str
        - bereich: str
        - eintrag: str
        - intervall: str
        - faelligkeit: str
        - status: str

    ``days`` gibt den Erinnerungszeitraum an, der in der E-Mail erwähnt wird.

    Returns True wenn die E-Mail erfolgreich gesendet wurde, sonst False.
    """
    if not recipient_email:
        logger.warning("Service-Erinnerungs-E-Mail konnte nicht gesendet werden: keine Empfänger-Adresse.")
        return False

    if not items:
        return False

    org = f" ({fw_name})" if fw_name else ""
    subject = f"Wartungs- & Service-Erinnerung{org}"

    lines = [
        f"Folgende Einträge sind in den nächsten {days} Tagen fällig{org}:\n",
        f"{'Modul':<20} {'Bereich':<12} {'Eintrag':<40} {'Intervall':<25} {'Fälligkeit':<12} Status",
        "-" * 120,
    ]
    for item in items:
        lines.append(
            f"{item.get('modul', ''):<20} "
            f"{item.get('bereich', ''):<12} "
            f"{item.get('eintrag', ''):<40} "
            f"{item.get('intervall', ''):<25} "
            f"{item.get('faelligkeit', ''):<12} "
            f"{item.get('status', '')}"
        )

    lines.append("\nBitte prüfe und plane die notwendigen Maßnahmen rechtzeitig.")
    lines.append("\nMit freundlichen Grüßen\nDein Blaulicht Cloud Team")

    message = "\n".join(lines)

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        logger.info("Service-Erinnerungs-E-Mail mit %d Einträgen an '%s' gesendet.", len(items), recipient_email)
        return True
    except Exception:
        logger.exception("Fehler beim Senden der Service-Erinnerungs-E-Mail an '%s'.", recipient_email)
        return False
