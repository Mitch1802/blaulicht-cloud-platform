import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_welcome_email(username: str, password: str, email: str, first_name: str = "") -> bool:
    """
    Sendet die Zugangsdaten an einen neu erstellten Benutzer.

    Returns True wenn die E-Mail erfolgreich gesendet wurde, sonst False.
    """
    if not email:
        logger.warning("Willkommens-E-Mail konnte nicht gesendet werden: keine E-Mail-Adresse für Benutzer '%s'.", username)
        return False

    greeting = f"Hallo {first_name}," if first_name else "Hallo,"
    subject = "Deine Zugangsdaten für die Blaulicht Cloud"
    message = (
        f"{greeting}\n\n"
        f"Dein Konto wurde erfolgreich erstellt. Hier sind deine Zugangsdaten:\n\n"
        f"Benutzername: {username}\n"
        f"Passwort: {password}\n\n"
        f"Bitte ändere dein Passwort nach dem ersten Login.\n\n"
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
        logger.info("Willkommens-E-Mail an '%s' gesendet.", email)
        return True
    except Exception:
        logger.exception("Fehler beim Senden der Willkommens-E-Mail an '%s'.", email)
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
