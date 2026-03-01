# Storybook Guide

Diese Datei dokumentiert die Storybook-Integration für das Frontend.

## Ziel

Storybook dient als zentrale UI-Dokumentation für:

- globale Layout-Patterns
- wiederverwendbare UI-Bausteine aus der `ui-library`
- den App-weiten UI-Katalog (alle in Templates verwendeten Elemente)

Zusätzlich stellt der UI-Katalog-Check sicher, dass nur katalogisierte Elemente/Klassen verwendet werden.

---

## Projektstruktur

Wichtige Dateien:

- `.storybook/main.ts`
- `.storybook/preview.ts`
- `.storybook/tsconfig.json`
- `frontend/src/app/ui-library/*.stories.ts`
- `frontend/src/app/ui-library/ui-element-catalog.json`
- `frontend/scripts/verify-ui-catalog.mjs`

Storybook Build-Output:

- `frontend/storybook-static`

---

## Lokale Verwendung

Im `frontend`-Verzeichnis:

```bash
npm run storybook
```

Für CI/anderen Port (ohne npm-Argument-Parsing-Probleme):

```bash
npm run storybook:ci
```

Statischer Build:

```bash
npm run build-storybook
```

Hinweis zur Log-Ausgabe:

- Der Dev-Start (`storybook`) läuft ohne Compodoc für weniger Konsolenrauschen.
- Der Static Build (`build-storybook`) nutzt weiterhin Compodoc für die Doku-Erzeugung.

UI-Katalog prüfen:

```bash
npm run verify:ui-catalog
```

---

## UI-Katalog-Regelwerk

Der Katalog liegt in:

- `frontend/src/app/ui-library/ui-element-catalog.json`

Der Validator (`verify-ui-catalog`) scannt alle `frontend/src/app/**/*.html` und prüft:

1. Verwendete `mat-*` Elemente müssen im Katalog enthalten sein.
2. Verwendete getrackte UI-/Layout-Klassen müssen im Katalog enthalten sein.
3. Jede `actions`-Tabellenspalte muss am Zellen-`td` die Klasse `ui-action-cell` haben.
4. Material-Buttons dürfen keine ad-hoc Spacing-Utility-Klassen wie `ms-*`, `me-*`, `px-*`, `py-*` etc. verwenden.
5. Buttons in `actions`-Spalten sind auf die Farbvarianten `primary` oder `warn` begrenzt und müssen ein `mat-icon` enthalten.
6. `mat-icon` in `actions`-Buttons muss in der zentralen Allowlist `actionIcons` im UI-Katalog enthalten sein.

Bei Verstößen bricht der Command mit Exit-Code `1` ab.

---

## CI-Integration

Der Check ist in GitHub Actions eingebunden in:

- `.github/workflows/02_build_push.yml`

Reihenfolge im Frontend-CI:

1. `npm ci`
2. `npm run verify:ui-catalog`
3. `npm run build`

Damit wird verhindert, dass nicht katalogisierte UI-Elemente in den Build gelangen.

---

## Storybook-Kategorien

Beispiele in Storybook:

- `Design System/Layout/Page Layout`
- `Design System/Layout/Section Card`
- `Design System/Layout/Grid Recipes`
- `Design System/Patterns/Form`
- `Design System/Patterns/Table`
- `Design System/Catalog/All App Elements`
- `Design System/Catalog/Allowed Action Icons`
- `Design System/Catalog/Action Governance`

---

## Wenn neue UI-Elemente dazukommen

1. Neues Element in Story/Pattern dokumentieren.
2. `frontend/src/app/ui-library/ui-element-catalog.json` erweitern.
3. `npm run verify:ui-catalog` lokal ausführen.
4. Storybook (`npm run storybook` oder `npm run build-storybook`) prüfen.

So bleibt die App-UI konsistent und nachvollziehbar dokumentiert.
