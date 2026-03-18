# Layout Guide (Grid + Tabellenblöcke)

Diese Doku beschreibt das aktuelle Grid-System im Frontend, damit Tabellenbereiche flexibel wie bei Bootstrap aufgebaut werden können (z. B. „col-4“, „col-12“) inklusive Mobile/Desktop-Verhalten.

## Grundprinzip

- Container für das Grid: `.app-grid` (oder `.row`)
- Elemente im Grid: `.app-col-*` (oder `.col-*`)
- Standard ist mobile-first: Ohne Breakpoint spannen Items standardmäßig die volle Breite.

## Unterstützte Klassen

### Basis (alle Viewports)

- `.app-col-2`, `.app-col-3`, `.app-col-4`, `.app-col-6`, `.app-col-7`, `.app-col-8`, `.app-col-12`
- Alias vorhanden: `.col-2`, `.col-3`, `.col-4`, `.col-6`, `.col-7`, `.col-8`, `.col-12`

### Breakpoints

- Ab `768px`:
  - `.app-col-md-6`, `.app-col-md-10`
- Ab `1200px`:
  - `.app-col-lg-2`, `.app-col-lg-3`, `.app-col-lg-4`, `.app-col-lg-5`, `.app-col-lg-6`, `.app-col-lg-7`, `.app-col-lg-8`, `.app-col-lg-9`, `.app-col-lg-12`

## Typische Patterns für Tabellenbereiche

### 1) Eine Tabelle full-width

```html
<section class="app-grid">
  <div class="app-col-12">
    <!-- table/card -->
  </div>
</section>
```

### 2) Zwei Tabellen auf Desktop, mobil untereinander

```html
<section class="app-grid">
  <div class="app-col-12 app-col-lg-6">
    <!-- Tabelle A -->
  </div>

  <div class="app-col-12 app-col-lg-6">
    <!-- Tabelle B -->
  </div>
</section>
```

Effekt:

- Mobile: beide Blöcke untereinander (12/12)
- Desktop (`>=1200px`): 2-spaltig (6/6)

### 3) Drei Tabellen auf Desktop (4/4/4), mobil untereinander

```html
<section class="app-grid">
  <div class="app-col-12 app-col-lg-4"><!-- A --></div>
  <div class="app-col-12 app-col-lg-4"><!-- B --></div>
  <div class="app-col-12 app-col-lg-4"><!-- C --></div>
</section>
```

### 4) Asymmetrisch (8/4)

```html
<section class="app-grid">
  <div class="app-col-12 app-col-lg-8"><!-- Haupttabelle --></div>
  <div class="app-col-12 app-col-lg-4"><!-- Nebenpanel/Tabelle --></div>
</section>
```

## Empfehlungen

- Für neue Module bevorzugt `.app-col-*` nutzen.
- Für responsive Tabellenlayouts immer mit `app-col-12` starten und dann Desktop-Breakpoints ergänzen.
- Pro Zeile sollten sich Desktop-Spalten logisch auf 12 summieren (z. B. 6+6, 4+4+4, 8+4).

## Copy/Paste Rezepte

### A) Form oben, Tabelle darunter (Standard-Modul)

```html
<section class="app-grid imr-form-grid">
  <div class="app-col-12">
    <!-- Formular-Card -->
  </div>

  <div class="app-col-12">
    <!-- Tabellen-Card / Tabelle -->
  </div>
</section>
```

### B) Zwei Tabellen nebeneinander auf Desktop

```html
<section class="app-grid">
  <div class="app-col-12 app-col-lg-6">
    <!-- Tabelle links -->
  </div>

  <div class="app-col-12 app-col-lg-6">
    <!-- Tabelle rechts -->
  </div>
</section>
```

### C) Master/Detail (Liste breit, Details schmal)

```html
<section class="app-grid">
  <div class="app-col-12 app-col-lg-8">
    <!-- Master-Liste/Tabelle -->
  </div>

  <div class="app-col-12 app-col-lg-4">
    <!-- Detailbereich / zusätzliche Infos -->
  </div>
</section>
```

### D) Drei gleich breite Bereiche auf Desktop

```html
<section class="app-grid">
  <div class="app-col-12 app-col-lg-4"><!-- Bereich 1 --></div>
  <div class="app-col-12 app-col-lg-4"><!-- Bereich 2 --></div>
  <div class="app-col-12 app-col-lg-4"><!-- Bereich 3 --></div>
</section>
```

### E) Tablet schon zweispaltig, Desktop weiterhin zweispaltig

```html
<section class="app-grid">
  <div class="app-col-12 app-col-md-6">
    <!-- Block A -->
  </div>

  <div class="app-col-12 app-col-md-6">
    <!-- Block B -->
  </div>
</section>
```

## Technische Quelle

Die Grid-Regeln sind zentral definiert in:

- `frontend/src/styles.sass`
