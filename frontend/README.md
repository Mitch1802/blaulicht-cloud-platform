# Entwicklungsumgebung

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## TODOS

ng add @angular/pwa@21

## SETUP new Environment

```
npm install -g @angular/cli@21
npm install
```


## Build for Deployment
```
ng build --configuration production
```

## Sass-Struktur

Die globale Sass-Architektur ist in vier klar getrennte Dateien aufgeteilt:

- `src/theme.sass`: Definiert nur das Angular-Material-Theme und die zentralen Sass-Farbwerte. Keine globalen Selektoren, keine Seitenlayout-Mixins, keine IMR-Wrapper.
- `src/styles.sass`: Globaler Einstieg fuer das Frontend. Hier werden `mat.core()`, `mat.all-component-themes(...)` und die globalen App-Styles ausgegeben. App-weite Material-Overrides sollen hier bevorzugt mit CSS-Variablen arbeiten.
- `src/imr-catalog.sass`: Enthaelt nur globalen IMR-Library-Code wie `:root`-Tokens, IMR-Wrapper-Klassen, `imr-grid` und library-weite Overrides. Keine komponentenspezifischen `@use`-Imports von `src/app/imr-ui-library/*`.
- `src/imr-layout.sass`: Enthaelt nur globale Layout-Mixins wie `imr-admin-page-shell` und `imr-admin-page-mobile`.

## Sass-Regeln

- Das Angular-Material-Theme wird global nur einmal ueber `src/styles.sass` ausgegeben.
- `angular.json` bindet global nur `src/styles.sass` ein, nicht `src/theme.sass` separat.
- Komponenten sollen `src/theme.sass` nur dann direkt importieren, wenn sie wirklich `theme.$imr-*` Farbwerte brauchen.
- Komponenten mit Seitenlayout-Mixins sollen dafuer `src/imr-layout.sass` importieren.
- Globale Farben in `src/styles.sass` sollen bevorzugt ueber die IMR-CSS-Variablen wie `var(--imr-primary)` oder `var(--imr-border)` laufen.
- Neue globale IMR-Tokens gehoeren in `src/imr-catalog.sass` unter `:root`.

## Beispiel

Layout-only-Komponente:

```sass
@use '../../imr-layout' as layout

.example-page
	+layout.imr-admin-page-shell
	+layout.imr-admin-page-mobile(768px)
```

Komponente mit Layout und Theme-Farben:

```sass
@use '../../theme' as theme
@use '../../imr-layout' as layout

.example-page
	+layout.imr-admin-page-shell

	.headline
		color: theme.$imr-primary
```
