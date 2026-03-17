# IMR UI Library – Dokumentation

## Übersicht

Die **IMR UI Library** ist die eigene Komponentenbibliothek der Blaulicht-Cloud-Platform.
Sie stellt wiederverwendbare Angular-Komponenten bereit, die auf **Material Design 3** (via Angular Material) aufbauen und einheitlich mit dem Präfix `imr-` benannt sind.

---

## Architektur

```
frontend/src/
├── theme.sass              # Material Design 3 Theme – nur Hauptfarben
├── imr-catalog.sass        # IMR Design-Tokens + Komponenten-Stile + Material-Overrides
├── styles.sass             # Globale Styles – importiert Katalog, definiert Variablen
└── app/
    └── imr-ui-library/     # Eigene UI-Komponenten (imr-*)
        ├── index.ts
        ├── imr-page-layout.component.ts
        ├── imr-section-card.component.ts
        ├── imr-header.component.ts
        ├── imr-top-actions.component.ts
        ├── imr-form-actions.component.ts
        ├── imr-table-wrap.component.ts
        ├── imr-chips.component.ts
        ├── imr-form-grid.component.ts
        └── *.stories.ts    # Storybook-Stories
```

---

## Design-Prinzipien

### 1. `theme.sass` – nur Hauptfarben

Das Theme-File definiert ausschließlich das **Material Design 3 Theme** und leitet daraus
die **Hauptfarben** als SASS-Variablen ab:

```sass
$imr-primary:        mat.get-theme-color($blaulichtcloud-theme, primary, 40)
$imr-secondary:      mat.get-theme-color($blaulichtcloud-theme, tertiary, 40)
$imr-error:          mat.get-theme-color($blaulichtcloud-theme, error, 40)
// ...
```

Um die primäre oder sekundäre Farbe zu ändern, genügt es, im `$blaulichtcloud-theme`
die Palette zu wechseln (z. B. `mat.$indigo-palette`).

### 2. `imr-catalog.sass` – Design-Tokens und Komponenten-Stile

Der Katalog ist die **zentrale Styling-Quelle**. Er:

- definiert **CSS Custom Properties** (Design-Tokens) für alle IMR-Komponenten
- überschreibt **Angular Material** Standardstile (Buttons, Cards, Tabellen, etc.)
- definiert die **Layout-Stile** für alle `imr-*` CSS-Klassen
- enthält das **Grid-System** und **Utility-Klassen**

Alle Werte sind als CSS-Variable verfügbar:

```css
/* Farben */
--imr-primary, --imr-primary-dark, --imr-primary-deep, --imr-primary-soft
--imr-accent, --imr-accent-soft
--imr-error, --imr-success, --imr-warning

/* Oberflächen */
--imr-surface, --imr-surface-variant, --imr-border, --imr-text, --imr-text-muted

/* Steuerelemente */
--imr-control-radius: 10px
--imr-control-height: 40px
--imr-control-bg, --imr-control-border

/* Cards */
--imr-card-radius: 1rem
--imr-card-padding, --imr-card-padding-mobile
--imr-card-bg, --imr-card-shadow, --imr-card-border

/* Layout */
--imr-page-max-width: 1600px
--imr-page-padding, --imr-page-padding-mobile

/* Header */
--imr-header-height: 56px
--imr-header-bg, --imr-header-shadow

/* Tabellen */
--imr-table-header-bg, --imr-table-row-even-bg, --imr-table-row-hover-bg

/* Grid */
--imr-grid-columns: 12
--imr-grid-row-gap: .75rem
--imr-grid-col-gap: 1rem
```

### 3. `styles.sass` – Variablen und Backward-Compatibility

Die globale Styles-Datei:
- importiert `imr-catalog.sass`
- setzt die Basis-Font-Family
- definiert **`--app-*` CSS-Variablen** als Alias auf die `--imr-*` Variablen
  (Backward-Compatibility für bestehende Feature-Komponenten)
- enthält `@extend`-Regeln, die alte CSS-Klassen (`ui-*`, `top-actions`, etc.)
  auf die neuen `imr-*` Klassen mappen

### 4. IMR-Komponenten – Design im UI-Katalog, minimal im Feature-Code

Alle Styles einer Komponente befinden sich im **IMR-Katalog**, nicht im Feature-Code.
Feature-Komponenten müssen nur noch die IMR-Komponenten verwenden:

```html
<!-- Vorher (alt) -->
<app-header [breadcrumb]="breadcrumb"></app-header>
<section class="ui-page">
  <header class="page-head">
    <h1>Meine Seite</h1>
  </header>
  <mat-card class="settings-card">
    <div class="section-head"><h2>Daten</h2></div>
    <mat-card-content>
      <!-- ... -->
    </mat-card-content>
  </mat-card>
</section>

<!-- Nachher (IMR) -->
<imr-header [breadcrumb]="breadcrumb"></imr-header>
<imr-page-layout title="Meine Seite">
  <imr-section-card title="Daten">
    <!-- ... -->
  </imr-section-card>
</imr-page-layout>
```

---

## Komponenten-Referenz

### `<imr-page-layout>`

Standardisierter Seiten-Container mit Überschrift und optionalem Header-Action-Slot.

| Input | Typ | Pflicht | Beschreibung |
|-------|-----|---------|--------------|
| `title` | `string` | ✅ | Seitenüberschrift (wird als `<h1>` gerendert) |

**Content-Slots:**

| Slot | Beschreibung |
|------|--------------|
| `[imrPageActions]` | Buttons/Aktionen rechts neben der Überschrift |
| _(default)_ | Seiteninhalt |

```html
<imr-page-layout title="Anwesenheitsliste">
  <div imrPageActions>
    <button mat-flat-button color="primary">Neu erstellen</button>
  </div>
  <imr-section-card title="Listen">
    <!-- ... -->
  </imr-section-card>
</imr-page-layout>
```

---

### `<imr-section-card>`

Card-Komponente für Modul-Bereiche. Kapselt `mat-card` mit einheitlichem Kopfbereich.

| Input | Typ | Pflicht | Beschreibung |
|-------|-----|---------|--------------|
| `title` | `string` | ❌ | Kartentitel (wird als `<h2>` gerendert). Ohne Titel kein Kopfbereich. |

**Content-Slots:**

| Slot | Beschreibung |
|------|--------------|
| `[imrCardActions]` | Aktionen im Kopfbereich rechts neben dem Titel |
| _(default)_ | Karteninhalt |

```html
<imr-section-card title="Mitglieder verwalten">
  <div imrCardActions>
    <button mat-flat-button color="accent">Hinzufügen</button>
  </div>
  <!-- Karteninhalt -->
</imr-section-card>
```

---

### `<imr-header>`

Haupt-Header der Anwendung (Toolbar + Breadcrumb).

| Input | Typ | Pflicht | Beschreibung |
|-------|-----|---------|--------------|
| `breadcrumb` | `ImrBreadcrumbItem[]` | ❌ | Breadcrumb-Einträge für die Navigation |

**`ImrBreadcrumbItem` Interface:**

```typescript
export interface ImrBreadcrumbItem {
  kuerzel?: string;   // Anzeigetext (primär, von NavigationService)
  label?: string;     // Anzeigetext (alternativ)
  link?: string | null;  // Navigations-URL (primär)
  url?: string | null;   // Navigations-URL (alternativ)
  number?: number;    // Laufende Nummer (optional)
}
```

```html
<imr-header [breadcrumb]="breadcrumb"></imr-header>
```

---

### `<imr-top-actions>`

Aktionsleiste für den oberen Bereich – für Filter-Inputs und primäre Buttons.

```html
<imr-top-actions>
  <mat-form-field style="max-width: 280px">
    <mat-label>Filter</mat-label>
    <input matInput (input)="applyFilter($event.target.value)" />
  </mat-form-field>
  <button mat-flat-button color="accent" (click)="add()">Hinzufügen</button>
</imr-top-actions>
```

---

### `<imr-form-actions>`

Aktionsleiste für Formularbereiche – für Speichern/Abbrechen-Buttons.

```html
<imr-form-actions>
  <button mat-flat-button color="accent" type="submit">Speichern</button>
  <button mat-flat-button color="primary" type="button" (click)="cancel()">Abbrechen</button>
</imr-form-actions>
```

---

### `<imr-table-wrap>`

Horizontaler Scroll-Container für `mat-table` Elemente. Unverzichtbar auf mobilen Geräten.

```html
<imr-table-wrap>
  <table mat-table [dataSource]="dataSource" matSort>
    <!-- Spalten -->
  </table>
  <mat-paginator [pageSizeOptions]="[10, 50, 100]" showFirstLastButtons></mat-paginator>
</imr-table-wrap>
```

---

### `<imr-chips>`

Container für `mat-chip` Gruppen mit einheitlichem Spacing und Styling.

```html
<imr-chips>
  <mat-chip-set>
    @for (rolle of rollen; track rolle) {
      <mat-chip [removable]="true" (removed)="removeRolle(rolle)">
        {{ rolle }}
        <mat-icon matChipRemove>cancel</mat-icon>
      </mat-chip>
    }
  </mat-chip-set>
</imr-chips>
```

---

### `<imr-form-grid>`

12-Spalten-Grid-Container für Formularfelder mit formular-spezifischen Abständen.

```html
<imr-form-grid>
  <div class="app-col-12 app-col-lg-6">
    <mat-form-field>
      <mat-label>Vorname</mat-label>
      <input matInput formControlName="vorname" />
    </mat-form-field>
  </div>
  <div class="app-col-12 app-col-lg-6">
    <mat-form-field>
      <mat-label>Nachname</mat-label>
      <input matInput formControlName="nachname" />
    </mat-form-field>
  </div>
</imr-form-grid>
```

---

## CSS-Klassen (ohne Komponenten-Wrapper)

Für Fälle, in denen kein Komponenten-Wrapper benötigt wird:

| IMR-Klasse | Beschreibung |
|------------|--------------|
| `imr-page` | Seiten-Container (max-width, padding) |
| `imr-page__head` | Seiten-Kopfbereich |
| `imr-card` | Card mit IMR-Styling |
| `imr-card__head` | Card-Kopfbereich |
| `imr-card__content` | Card-Inhaltsbereich |
| `imr-top-actions` | Obere Aktionsleiste |
| `imr-form-actions` | Formular-Aktionsleiste |
| `imr-form` | Formular-Container |
| `imr-form-grid` | Formular-Grid |
| `imr-two-col-md` | 2-Spalten-Layout ab 768px |
| `imr-full-width` | 100% Breite |
| `imr-table-wrap` | Tabellen-Container (scrollbar) |
| `imr-action-cell` | Aktionszelle in Tabellen |
| `imr-action-btn` | Kleiner Aktions-Button in Tabellen |
| `imr-chips` | Chip-Container |
| `imr-breadcrumb` | Breadcrumb-Navigation |
| `imr-lending-panel` | Leihe-Panel (Inventar) |
| `imr-transaction-*` | Buchungs-Dialog-Elemente |
| `imr-form-section` | Formular-Abschnitt-Card |

---

## Import

### Einzelne Komponenten importieren

```typescript
import { ImrPageLayoutComponent, ImrSectionCardComponent } from '../imr-ui-library';
```

### Alle Komponenten importieren

```typescript
import { IMR_UI_COMPONENTS } from '../imr-ui-library';

@Component({
  imports: [...IMR_UI_COMPONENTS],
})
```

---

## Backward-Compatibility

Alle alten `ui-*` Komponenten und CSS-Klassen sind weiterhin verfügbar und
leiten intern an die entsprechenden IMR-Komponenten/-Klassen weiter:

| Alt (deprecated) | Neu (IMR) |
|-----------------|-----------|
| `<ui-page-layout>` | `<imr-page-layout>` |
| `<ui-section-card>` | `<imr-section-card>` |
| `<app-header>` | `<imr-header>` |
| `.ui-page` | `.imr-page` |
| `.ui-card` | `.imr-card` |
| `.ui-top-actions` | `.imr-top-actions` |
| `.ui-actions` | `.imr-form-actions` |
| `.ui-table-wrap` | `.imr-table-wrap` |
| `.ui-chips` | `.imr-chips` |
| `[uiPageActions]` | `[imrPageActions]` |
| `[uiCardActions]` | `[imrCardActions]` |

---

## Theming / Farbschema anpassen

Um das Farbschema zu ändern, genügt es, **nur `theme.sass`** zu bearbeiten:

```sass
// theme.sass
$blaulichtcloud-theme: mat.define-theme((
  color: (
    theme-type: light,
    primary: mat.$indigo-palette,   // ← Andere Farbe wählen
    tertiary: mat.$orange-palette,  // ← Andere Akzentfarbe
  ),
  // ...
))
```

Alle CSS-Variablen im Katalog werden automatisch von den neuen Farbwerten abgeleitet.

---

## Storybook

Die IMR UI Library ist vollständig in Storybook dokumentiert:

```bash
cd frontend
npm run storybook
```

Stories befinden sich in `src/app/imr-ui-library/*.stories.ts`.

---

## Entwickler-Hinweise

- **Naming-Convention**: Alle IMR-Komponenten haben den Selektor `imr-*`
- **SASS-Variablen**: Werden in `theme.sass` als `$imr-*` definiert
- **CSS-Variablen**: Werden in `imr-catalog.sass` als `--imr-*` definiert
- **Responsive**: Der Katalog enthält alle Media-Queries
- **Keine Inline-Styles**: Anpassungen ausschließlich über CSS-Variablen oder den Katalog
