# ERROR REPORT - Rollenabgleich Startseite vs Backend

Datum: 2026-03-09

## Erkenntnisse

1. Rollen-Mismatch bei `Anwesenheitsliste`
- Start-Konfig erlaubt: `ADMIN, ANWESENHEIT`
- Backend erlaubt: `ADMIN, VERWALTUNG, MITGLIED`
- Folge: User mit nur `ANWESENHEIT` sehen das Modul auf Start, bekommen aber 403 in der API.

2. Rollen-Mismatch bei `Wartung/Service`
- Start-Konfig erlaubt: `ADMIN, KOMMANDO`
- Backend erlaubt: `ADMIN, INVENTAR, FAHRZEUG, ATEMSCHUTZ, PROTOKOLL`
- Folge: User mit nur `KOMMANDO` sehen das Modul auf Start, bekommen aber 403 in der API.

3. Geplante Module ohne Route
- Start-Konfig enthaelt: `/aufgaben`, `/ausbildung`
- In `app.routes.ts` existieren dafuer aktuell keine Routen.
- Folge: Kachel sichtbar, Navigation laeuft ins Leere.

4. Jugend-Problem (zuvor) war Berechtigungs-/Endpoint-seitig
- Fuer `JUGEND` wurden Zugriffe auf `users/self`, `modul_konfiguration` (read-only) und `jugend/*` angepasst.
- Frontend nutzt jetzt `jugend/mitglieder` statt `mitglieder` fuer das Jugend-Modul.

## Empfehlung

- Entweder Startrollen an Backend anpassen oder Backend-Permissions an Startrollen angleichen.
- Fuer `ANWESENHEIT` und `KOMMANDO` eine klare, einheitliche Rollenstrategie festlegen.
- Geplante Module ohne Route entweder ausblenden oder Routen/Feature implementieren.
