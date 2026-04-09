# IMR UI Library – Aktueller Stand (April 2026)

## Kurzfassung

Die App verwendet als IMR-Bausteine im produktiven Code nur noch:

- imr-header
- imr-page-layout
- imr-section
- imr-card
- uiControlErrors (Direktive)
- UiControlErrorMap (Typ/Token)

Damit ist die IMR-Library faktisch auf Layout + Header + Formular-Fehlermapping reduziert.

## Public API (barrel)

Datei: frontend/src/app/imr-ui-library/index.ts

Aktiv exportiert:

- ImrPageLayoutComponent
- ImrSectionComponent
- ImrHeaderComponent
- ImrCardComponent
- UiControlErrorsDirective
- UiControlErrorMap

## Struktur

```text
frontend/src/app/imr-ui-library/
  index.ts
  imr-header/
  imr-page-layout/
  imr-section/
  imr-card/
  ui-control-errors/
  ui-control-error-map.token.ts
```

## Hinweis zu verbleibenden Restdateien

Im Repository existieren noch einzelne Legacy-Wrapper-Dateien/Ordner (z. B. aus früheren Migrationsstufen), die derzeit nicht mehr über den Barrel exportiert und im App-Code nicht mehr verwendet werden.

Diese können in weiteren Aufräumrunden entfernt werden, sofern keine Storybook-/Test-Abhängigkeit mehr besteht.

## Design-Regeln

1. Neue Feature-UI bevorzugt Angular Material direkt (mat-*).
2. IMR nur für Seitenlayout/Struktur verwenden (Header, Page-Layout, Section, Card).
3. Keine neuen IMR-Wrapper für Material-Einzelelemente (Buttons, Inputs, Select etc.) anlegen.
4. Fehlertexte in Formularen über uiControlErrors konsistent halten.

## Beispiel

```html
<imr-header [breadcrumb]="breadcrumb"></imr-header>

<imr-page-layout [title]="title">
  <imr-section title="Daten">
    <imr-card>
      <mat-form-field>
        <mat-label>Name</mat-label>
        <input matInput formControlName="name" uiControlErrors />
      </mat-form-field>
    </imr-card>
  </imr-section>
</imr-page-layout>
```
