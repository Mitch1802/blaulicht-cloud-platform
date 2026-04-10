# IMR UI Library – Aktueller Stand (April 2026)

## Kurzfassung

Die App verwendet als IMR-Bausteine im produktiven Code nur noch:

- imr-header
- imr-page-layout
- imr-section
- imr-card

Damit ist die IMR-Library faktisch auf Layout + Header reduziert.

## Public API (barrel)

Datei: frontend/src/app/imr-ui-library/index.ts

Aktiv exportiert:

- ImrPageLayoutComponent
- ImrSectionComponent
- ImrHeaderComponent
- ImrCardComponent

## Struktur

```text
frontend/src/app/imr-ui-library/
  index.ts
  imr-header/
  imr-page-layout/
  imr-section/
  imr-card/
```

## Hinweis zu verbleibenden Restdateien

Legacy-Wrapper und das frühere UI-Error-Mapping wurden entfernt.

## Design-Regeln

1. Neue Feature-UI bevorzugt Angular Material direkt (mat-*).
2. IMR nur für Seitenlayout/Struktur verwenden (Header, Page-Layout, Section, Card).
3. Keine neuen IMR-Wrapper für Material-Einzelelemente (Buttons, Inputs, Select etc.) anlegen.

## Beispiel

```html
<imr-header [breadcrumb]="breadcrumb"></imr-header>

<imr-page-layout [title]="title">
  <imr-section title="Daten">
    <imr-card>
      <mat-form-field>
        <mat-label>Name</mat-label>
        <input matInput formControlName="name" />
      </mat-form-field>
    </imr-card>
  </imr-section>
</imr-page-layout>
```

