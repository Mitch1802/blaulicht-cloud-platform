# E-Mail-Infrastruktur – Blaulicht Cloud Platform

Diese Dokumentation beschreibt alles rund um den E-Mail-Versand im Backend der Blaulicht Cloud Platform.

---

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Funktionsweise](#funktionsweise)
3. [Umgebungsvariablen (Konfiguration)](#umgebungsvariablen-konfiguration)
4. [Lokale Entwicklung vs. Produktion](#lokale-entwicklung-vs-produktion)
5. [Anwendungsfälle](#anwendungsfälle)
   - [Willkommens-E-Mail bei Benutzererstellung](#1-willkommens-e-mail-bei-benutzererstellung)
   - [Service-Erinnerungs-E-Mail](#2-service-erinnerungs-e-mail)
6. [Management-Kommando: send_service_reminders](#management-kommando-send_service_reminders)
7. [Automatisierung per Cron-Job](#automatisierung-per-cron-job)
8. [Hilfsfunktionen (API)](#hilfsfunktionen-api)
9. [Dateistruktur](#dateistruktur)
10. [Sicherheitshinweise](#sicherheitshinweise)

---

## Übersicht

Die E-Mail-Infrastruktur des Backends basiert vollständig auf **Django's eingebautem E-Mail-Framework** (`django.core.mail`). Es werden keine externen E-Mail-Bibliotheken benötigt.

Aktuell gibt es zwei automatisch ausgelöste E-Mail-Arten:

| Typ | Auslöser | Empfänger |
|-----|----------|-----------|
| Willkommens-E-Mail | Admin legt neuen Benutzer an | E-Mail-Adresse des neuen Benutzers |
| Service-Erinnerungs-E-Mail | Manuell / Cron-Job | Feuerwehr-E-Mail aus der Konfiguration |

---

## Funktionsweise

Alle E-Mail-Funktionen sind in einem zentralen Utility-Modul gesammelt:

```
django/core_apps/common/email.py
```

Dieses Modul stellt zwei Funktionen zur Verfügung:

- `send_welcome_email(...)` – Willkommens-E-Mail mit Zugangsdaten
- `send_service_reminder_email(...)` – Erinnerung an fällige Services/Wartungen

Der eigentliche Versand erfolgt über `django.core.mail.send_mail`, das seinerseits den konfigurierten `EMAIL_BACKEND` verwendet.

---

## Umgebungsvariablen (Konfiguration)

Alle E-Mail-Einstellungen werden über Umgebungsvariablen gesteuert. Diese werden in der Datei
`django/rest_api/settings/base.py` ausgelesen.

| Umgebungsvariable | Django-Setting | Standard-Wert | Beschreibung |
|---|---|---|---|
| `DJANGO_EMAIL_BACKEND` | `EMAIL_BACKEND` | `django.core.mail.backends.console.EmailBackend` | E-Mail-Backend (Console oder SMTP) |
| `DJANGO_EMAIL_HOST` | `EMAIL_HOST` | _(leer)_ | Hostname des SMTP-Servers |
| `DJANGO_EMAIL_PORT` | `EMAIL_PORT` | `587` | Port des SMTP-Servers |
| `DJANGO_EMAIL_USE_TLS` | `EMAIL_USE_TLS` | `True` | STARTTLS aktivieren |
| `DJANGO_EMAIL_HOST_USER` | `EMAIL_HOST_USER` | _(leer)_ | SMTP-Benutzername |
| `DJANGO_EMAIL_HOST_PASSWORD` | `EMAIL_HOST_PASSWORD` | _(leer)_ | SMTP-Passwort |
| `DJANGO_DEFAULT_FROM_EMAIL` | `DEFAULT_FROM_EMAIL` | `noreply@blaulichtcloud.at` | Absender-Adresse |
| `DJANGO_EMAIL_TIMEOUT` | `EMAIL_TIMEOUT` | `10` | Verbindungs-Timeout in Sekunden |

### Beispiel `.env` für Produktion (SMTP)

```env
DJANGO_EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
DJANGO_EMAIL_HOST=smtp.world4you.com
DJANGO_EMAIL_PORT=587
DJANGO_EMAIL_USE_TLS=True
DJANGO_EMAIL_HOST_USER=app@blaulichtcloud.at
DJANGO_EMAIL_HOST_PASSWORD=9d9MXrBA9jKYmAMq
DJANGO_DEFAULT_FROM_EMAIL=app@blaulichtcloud.at
DJANGO_EMAIL_TIMEOUT=10
```

### Beispiel `.env` für lokale Entwicklung (Console-Backend)

```env
DJANGO_EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

Im Console-Backend werden alle E-Mails direkt in das Django-Server-Log (stdout) geschrieben – kein SMTP-Server nötig.

---

## Lokale Entwicklung vs. Produktion

| | Lokal / Dev | Produktion |
|---|---|---|
| `EMAIL_BACKEND` | `console.EmailBackend` *(Standard)* | `smtp.EmailBackend` |
| SMTP-Server nötig | **Nein** | **Ja** |
| E-Mails sichtbar | Im Terminal-Output | Beim Empfänger / im Postfach |

> **Wichtig:** Ohne explizite Konfiguration von `DJANGO_EMAIL_BACKEND` landet jede E-Mail nur im Terminal. Es wird keine echte E-Mail versendet. Das ist das gewünschte Verhalten in der Entwicklung.

---

## Anwendungsfälle

### 1. Willkommens-E-Mail bei Benutzererstellung

**Auslöser:** Ein Administrator erstellt über die Benutzerverwaltung einen neuen Benutzer (API-Endpunkt `POST /users/create/`).

**Verhalten:** Sofern für den neuen Benutzer eine E-Mail-Adresse angegeben wurde, wird automatisch eine E-Mail mit dem Benutzernamen und dem initial gesetzten Passwort verschickt.

**Betreff:** `Deine Zugangsdaten für die Blaulicht Cloud`

**Inhalt der E-Mail:**

```
Hallo [Vorname],

Dein Konto wurde erfolgreich erstellt. Hier sind deine Zugangsdaten:

Benutzername: [username]
Passwort: [passwort]

Bitte ändere dein Passwort nach dem ersten Login.

Mit freundlichen Grüßen
Dein Blaulicht Cloud Team
```

**Kein Fehler, wenn keine E-Mail-Adresse hinterlegt ist:** Die Funktion überspringt den Versand still und schreibt einen Warnungs-Eintrag ins Log.

**Relevante Dateien:**
- `django/core_apps/users/serializers.py` → `AdminCreateUserSerializer.create()`
- `django/core_apps/common/email.py` → `send_welcome_email()`

---

### 2. Service-Erinnerungs-E-Mail

**Auslöser:** Manuell oder automatisch per Cron-Job (siehe unten).

**Verhalten:** Das Backend prüft alle konfigurierten Services und Wartungen und listet alle Einträge, die innerhalb des angegebenen Zeitraums (Standard: 30 Tage) fällig sind. Gibt es fällige Einträge, wird eine zusammenfassende E-Mail an die Feuerwehr-E-Mail-Adresse aus der Konfiguration gesendet.

**Geprüfte Bereiche:**

| Modul | Bereich | Intervall-Typ |
|-------|---------|---------------|
| Fahrzeuge | Service | nächstes Service-Datum |
| Fahrzeuge | Wartung | Beladungs-Wartung (Raumitems) |
| Inventar | Wartung | Wartungs-Datum |
| Atemschutz Geräte | Prüfung | Monatlich, jährlich, 10-Jahres-Prüfung |
| Messgeräte | Service | Kalibrierung (jährlich) |
| Messgeräte | Wartung | Wöchentliche Kontrolle, jährliche Wartung |

**Status-Werte in der E-Mail:**

| Status | Bedeutung |
|--------|-----------|
| `ueberfaellig` | Fälligkeit liegt in der Vergangenheit |
| `heute` | Fälligkeit ist heute |
| `anstehend` | Fälligkeit liegt in der Zukunft (im gewählten Zeitraum) |

**Betreff:** `Wartungs- & Service-Erinnerung (Feuerwehr Name)`

**Relevante Dateien:**
- `django/core_apps/wartung_service/management/commands/send_service_reminders.py`
- `django/core_apps/common/email.py` → `send_service_reminder_email()`

---

## Management-Kommando: `send_service_reminders`

Das Kommando wird im Django-Container (oder direkt auf dem Server) ausgeführt:

```bash
python manage.py send_service_reminders
```

### Optionen

| Option | Standard | Beschreibung |
|--------|----------|--------------|
| `--days N` | `30` | Erinnerungszeitraum in Tagen |
| `--recipient EMAIL` | *(aus Konfiguration)* | Empfänger-Adresse (überschreibt fw_email) |
| `--dry-run` | `False` | Zeigt fällige Einträge an, **sendet keine E-Mail** |

### Beispiele

```bash
# Standard: nächste 30 Tage, Empfänger aus Konfiguration
python manage.py send_service_reminders

# Nur die nächsten 14 Tage prüfen
python manage.py send_service_reminders --days 14

# Bestimmten Empfänger angeben (überschreibt die Konfiguration)
python manage.py send_service_reminders --recipient kommandant@feuerwehr.at

# Vorschau ohne E-Mail-Versand
python manage.py send_service_reminders --dry-run

# Kombiniert: 7 Tage, anderer Empfänger, nur Vorschau
python manage.py send_service_reminders --days 7 --recipient test@example.com --dry-run
```

### Empfänger-Ermittlung

Der Empfänger wird in folgender Reihenfolge ermittelt:

1. `--recipient` Argument (hat höchste Priorität)
2. `fw_email` aus der Datenbank-Konfiguration (Tabelle `Konfiguration`)
3. Fehler: Kommando bricht ab mit einer Fehlermeldung

---

## Automatisierung per Cron-Job

Um die Service-Erinnerungen regelmäßig und automatisch zu versenden, sollte ein Cron-Job eingerichtet werden.

### Cron-Eintrag (Beispiel: täglich um 07:00 Uhr)

```cron
0 7 * * * /app/manage.py send_service_reminders >> /var/log/service_reminders.log 2>&1
```

### Cron-Eintrag im Docker-Container

Falls der Django-Dienst in Docker läuft (z. B. mit `docker compose`):

```cron
0 7 * * * docker exec <container_name> python /app/manage.py send_service_reminders
```

### Empfohlene Konfiguration

| Anforderung | Empfehlung |
|-------------|------------|
| Erinnerung 1 Monat im Voraus | `--days 30` (Standard) |
| Erinnerung 2 Wochen im Voraus | `--days 14` |
| Täglich ausführen | Cron: `0 7 * * *` |
| Wöchentlich ausführen | Cron: `0 7 * * 1` (jeden Montag) |

---

## Hilfsfunktionen (API)

Datei: `django/core_apps/common/email.py`

### `send_welcome_email`

```python
send_welcome_email(
    username: str,
    password: str,
    email: str,
    first_name: str = ""
) -> bool
```

Sendet die Zugangsdaten an einen neu erstellten Benutzer.

- Gibt `True` zurück, wenn die E-Mail erfolgreich gesendet wurde.
- Gibt `False` zurück, wenn keine E-Mail-Adresse angegeben wurde oder ein Fehler aufgetreten ist.
- Fehler werden geloggt, aber **nicht** als Exception weitergegeben.

---

### `send_service_reminder_email`

```python
send_service_reminder_email(
    recipient_email: str,
    items: list[dict],
    fw_name: str = "",
    days: int = 30
) -> bool
```

Sendet eine Erinnerungs-E-Mail mit einer Tabelle der fälligen Wartungen/Services.

**Parameter `items`** – Liste von Dicts mit folgenden Schlüsseln:

| Schlüssel | Typ | Beschreibung |
|-----------|-----|--------------|
| `modul` | `str` | Modul-Name (z. B. `"Fahrzeuge"`) |
| `bereich` | `str` | Bereich (z. B. `"Service"`, `"Prüfung"`) |
| `eintrag` | `str` | Bezeichnung des Eintrags |
| `intervall` | `str` | Intervall-Beschreibung (z. B. `"Jährliche Prüfung"`) |
| `faelligkeit` | `str` | Fälligkeitsdatum im Format `dd.mm.yyyy` |
| `status` | `str` | `ueberfaellig`, `heute` oder `anstehend` |

- Gibt `True` zurück wenn erfolgreich gesendet, sonst `False`.
- Wenn `items` leer ist, wird **keine E-Mail** gesendet und `False` zurückgegeben.

---

## Dateistruktur

```
django/
├── rest_api/
│   └── settings/
│       └── base.py                          # E-Mail-Umgebungsvariablen (EMAIL_HOST etc.)
└── core_apps/
    ├── common/
    │   └── email.py                         # Zentrale E-Mail-Hilfsfunktionen
    ├── users/
    │   └── serializers.py                   # Willkommens-E-Mail in AdminCreateUserSerializer
    └── wartung_service/
        └── management/
            └── commands/
                └── send_service_reminders.py  # Management-Kommando für Erinnerungen
```

---

## Sicherheitshinweise

- **Klartext-Passwort in Willkommens-E-Mail:** Das initiale Passwort wird beim ersten Anlegen eines Benutzers im Klartext versandt. Dies ist nur beim admin-erstellten Erstkonto akzeptabel. Der Benutzer wird in der E-Mail aufgefordert, das Passwort **sofort nach dem ersten Login** zu ändern. In einem zukünftigen Release kann dies durch einen sicheren Passwort-Reset-Link ersetzt werden.

- **SMTP-Zugangsdaten:** Das SMTP-Passwort (`DJANGO_EMAIL_HOST_PASSWORD`) darf **niemals** direkt in den Code oder in die Versionsverwaltung eingecheckt werden. Ausschließlich Umgebungsvariablen oder Secrets-Manager verwenden.

- **TLS:** `DJANGO_EMAIL_USE_TLS=True` ist der Standard und sollte für Produktionssysteme immer aktiviert bleiben. Für SMTPS (Port 465) stattdessen `EMAIL_USE_SSL=True` setzen und `EMAIL_USE_TLS=False`.
