# Komponentenübersicht (Root) – Stand April 2026

Diese Übersicht beschreibt den aktuellen Zielzustand nach der IMR-Reduktion.

## IMR: aktiv in App-Modulen

Im produktiven App-Code werden nur folgende IMR-Elemente verwendet:

- imr-header
- imr-page-layout
- imr-section
- imr-card

Zusätzlich in TypeScript/Form-Logik:

- UiControlErrorsDirective (Selector: uiControlErrors)
- UiControlErrorMap

## Angular Material: Standard für Fach-UI

Fachkomponenten verwenden Material direkt, z. B.:

- mat-form-field, mat-label, mat-input
- mat-select, mat-option
- mat-table, mat-paginator, mat-sort
- mat-tab-group, mat-tab
- mat-accordion, mat-expansion-panel
- mat-chip-set, mat-chip
- mat-icon, mat-button-Varianten

## App-Einstiegspunkt

- app.component: mat-progress-bar (kein imr-progress-bar mehr)

## Modulstatus (zusammengefasst)

Folgende Bereiche nutzen die reduzierte IMR-Struktur (Header/Page/Section/Card) und ansonsten Material direkt:

- anwesenheitsliste
- atemschutz
- eigene-daten
- einsatzbericht
- fahrzeug (inkl. public/check)
- fmd
- homepage
- inventar
- invite
- jugend
- konfiguration
- login
- mitglied
- modul-konfiguration
- news
- news-extern
- pdf-templates
- start
- user
- verwaltung
- wartung-service
- _template/atemschutz-*

## Richtlinie

1. Keine neuen imr-* Wrapper für einzelne Material-Controls erstellen.
2. Neue UI-Elemente direkt als mat-* implementieren.
3. IMR nur für Layout-/Seitenrahmen verwenden.

## Dokumentationshinweis

Diese Datei wurde auf den aktuellen Migrationsstand bereinigt. Frühere Tabellen mit nicht mehr existierenden Wrappern (imr-button, imr-form-field, imr-select, imr-section-card, etc.) wurden entfernt.
