import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ImrFormFieldComponent } from './imr-form-field.component';
import { ImrLabelComponent } from './imr-label.component';
import { ImrErrorComponent } from './imr-error.component';
import { ImrSuffixComponent } from './imr-suffix.component';

/**
 * imr-form-field
 *
 * Wrapper around `mat-form-field` with IMR styling (outline appearance, 40 px height,
 * sharp corners). Use together with `imr-label`, `imr-error`, and `imr-suffix`.
 *
 * ```html
 * <imr-form-field hintLabel="* Pflichtfeld">
 *   <imr-label>E-Mail</imr-label>
 *   <input matInput type="email" formControlName="email" />
 *   <imr-error>E-Mail ist erforderlich!</imr-error>
 * </imr-form-field>
 * ```
 */
const meta: Meta<ImrFormFieldComponent> = {
  title: 'IMR UI Library/Wrappers/imr-form-field',
  component: ImrFormFieldComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
Wrapper around \`mat-form-field\` that applies consistent IMR styling:
outline appearance, standard Angular Material sizing, floating label, and IMR theme colors.
Corner radius is controlled by the global CSS token \`--mdc-shape-small\` (set to \`0px\` in the IMR catalog for sharp corners app-wide).

**Usage**
\`\`\`html
<imr-form-field hintLabel="* Pflichtfeld">
  <imr-label>E-Mail</imr-label>
  <input matInput type="email" formControlName="email" />
  <imr-error>E-Mail ist erforderlich!</imr-error>
</imr-form-field>
\`\`\`

**Child elements**

| Element | Zweck |
|---|---|
| \`<imr-label>\` | Schwebendes Label über dem Eingabefeld |
| \`<input matInput>\` | Eigentliches Eingabefeld |
| \`<imr-error>\` | Fehlermeldung unterhalb des Feldes |
| \`<imr-suffix>\` | Suffix rechts im Feld (Text oder Icon) |
        `,
      },
    },
  },
  decorators: [
    moduleMetadata({
      imports: [
        ImrFormFieldComponent,
        ImrLabelComponent,
        ImrErrorComponent,
        ImrSuffixComponent,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatIconModule,
        ReactiveFormsModule,
      ],
    }),
    applicationConfig({ providers: [provideNoopAnimations()] }),
  ],
};

export default meta;

/** Standard-Eingabefeld mit schwebendem Label */
export const MitLabel: StoryObj = {
  name: 'Mit Label',
  render: () => ({
    template: `
      <imr-form-field style="max-width: 320px; display: block">
        <imr-label>Vorname</imr-label>
        <input matInput value="Max" />
      </imr-form-field>
    `,
  }),
};

/** Leeres Feld – Label schwebt nach unten zurück */
export const Leer: StoryObj = {
  name: 'Leer (kein Wert)',
  render: () => ({
    template: `
      <imr-form-field style="max-width: 320px; display: block">
        <imr-label>Suchbegriff</imr-label>
        <input matInput />
      </imr-form-field>
    `,
  }),
};

/** Nur Platzhalter, kein Label */
export const NurPlaceholder: StoryObj = {
  name: 'Nur Placeholder (kein Label)',
  render: () => ({
    template: `
      <imr-form-field style="max-width: 320px; display: block">
        <input matInput placeholder="Suchen..." />
      </imr-form-field>
    `,
  }),
};

/** Feld mit Hinweis-Text und Pflichtfeld-Markierung */
export const MitHinweis: StoryObj = {
  name: 'Mit Hinweis',
  render: () => ({
    template: `
      <imr-form-field hintLabel="* Pflichtfeld" style="max-width: 320px; display: block">
        <imr-label>E-Mail</imr-label>
        <input matInput type="email" value="" />
      </imr-form-field>
    `,
  }),
};

/** Feld mit sichtbarer Fehlermeldung */
export const MitFehler: StoryObj = {
  name: 'Mit Fehlermeldung',
  render: () => ({
    props: {
      control: new FormControl('', Validators.required),
    },
    template: `
      <imr-form-field hintLabel="* Pflichtfeld" style="max-width: 320px; display: block">
        <imr-label>E-Mail</imr-label>
        <input matInput type="email" [formControl]="control" (blur)="control.markAsTouched()" />
        @if (control.hasError('required') && control.touched) {
          <imr-error>E-Mail ist erforderlich!</imr-error>
        }
      </imr-form-field>
      <button style="margin-top: 8px" (click)="control.markAsTouched()">Fehler anzeigen</button>
    `,
  }),
};

/** Feld mit Text-Suffix */
export const MitSuffix: StoryObj = {
  name: 'Mit Suffix',
  render: () => ({
    template: `
      <imr-form-field style="max-width: 320px; display: block">
        <imr-label>Benutzername</imr-label>
        <input matInput type="text" value="max.muster" />
        <imr-suffix>@example.com</imr-suffix>
      </imr-form-field>
    `,
  }),
};

/** Deaktiviertes Feld */
export const Deaktiviert: StoryObj = {
  name: 'Deaktiviert',
  render: () => ({
    template: `
      <imr-form-field style="max-width: 320px; display: block">
        <imr-label>Benutzername</imr-label>
        <input matInput value="admin" disabled />
      </imr-form-field>
    `,
  }),
};

/** Alle Varianten im Überblick */
export const AlleVarianten: StoryObj = {
  name: 'Alle Varianten',
  render: () => ({
    props: {
      errorControl: (() => {
        const c = new FormControl('', Validators.required);
        c.markAsTouched();
        return c;
      })(),
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 400px; padding: 1rem">
        <imr-form-field>
          <imr-label>Mit Label und Wert</imr-label>
          <input matInput value="Max Muster" />
        </imr-form-field>

        <imr-form-field>
          <imr-label>Leer (Label schwebt unten)</imr-label>
          <input matInput />
        </imr-form-field>

        <imr-form-field>
          <input matInput placeholder="Nur Placeholder, kein Label" />
        </imr-form-field>

        <imr-form-field hintLabel="* Pflichtfeld">
          <imr-label>Mit Hinweis</imr-label>
          <input matInput value="" />
        </imr-form-field>

        <imr-form-field hintLabel="* Pflichtfeld">
          <imr-label>Mit Fehler</imr-label>
          <input matInput [formControl]="errorControl" />
          <imr-error>Dieses Feld ist erforderlich!</imr-error>
        </imr-form-field>

        <imr-form-field>
          <imr-label>Mit Suffix</imr-label>
          <input matInput value="max.muster" />
          <imr-suffix>@example.com</imr-suffix>
        </imr-form-field>

        <imr-form-field>
          <imr-label>Deaktiviert</imr-label>
          <input matInput value="readonly" disabled />
        </imr-form-field>
      </div>
    `,
  }),
};

/**
 * Seite-an-Seite-Vergleich: gleiche Felder einmal mit reinen Angular-Material-Elementen
 * (mat-form-field, mat-label, mat-error, matSuffix, mat-select) und einmal mit den
 * IMR-Wrapper-Komponenten. Beide Spalten müssen visuell identisch aussehen.
 */
export const VergleichMitMaterial: StoryObj = {
  name: 'Vergleich: Angular Material vs. IMR Wrapper',
  parameters: {
    docs: {
      description: {
        story: `
Beide Spalten verwenden identische Felddaten, aber unterschiedliche Komponenten:
- **Links**: rohes Angular Material (\`mat-form-field\`, \`mat-label\`, \`mat-error\`, \`matSuffix\`, \`mat-select\`)
- **Rechts**: IMR-Wrapper (\`imr-form-field\`, \`imr-label\`, \`imr-error\`, \`imr-suffix\`) mit \`mat-select\` direkt als Control

Wenn die IMR-Bibliothek keine störenden CSS-Overrides enthält, sehen beide Spalten identisch aus.
        `,
      },
    },
  },
  render: () => ({
    props: {
      errorControl: (() => {
        const c = new FormControl('', Validators.required);
        c.markAsTouched();
        return c;
      })(),
      errorControl2: (() => {
        const c = new FormControl('', Validators.required);
        c.markAsTouched();
        return c;
      })(),
    },
    template: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; padding: 1.5rem; max-width: 900px">

        <!-- ── Linke Spalte: Reines Angular Material ─────────────────────── -->
        <div>
          <h3 style="margin: 0 0 1rem; font-size: .9rem; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: .05em">
            Angular Material (ohne IMR)
          </h3>
          <div style="display: flex; flex-direction: column; gap: 1rem">

            <mat-form-field appearance="outline">
              <mat-label>Mit Label und Wert</mat-label>
              <input matInput value="Max Muster" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Leer (Label schwebt unten)</mat-label>
              <input matInput />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <input matInput placeholder="Nur Placeholder, kein Label" />
            </mat-form-field>

            <mat-form-field appearance="outline" hintLabel="* Pflichtfeld">
              <mat-label>Mit Hinweis</mat-label>
              <input matInput value="" />
            </mat-form-field>

            <mat-form-field appearance="outline" hintLabel="* Pflichtfeld">
              <mat-label>Mit Fehler</mat-label>
              <input matInput [formControl]="errorControl" />
              <mat-error>Dieses Feld ist erforderlich!</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Mit Suffix</mat-label>
              <input matInput value="max.muster" />
              <span matSuffix>@example.com</span>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Deaktiviert</mat-label>
              <input matInput value="readonly" disabled />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Select-Feld</mat-label>
              <mat-select value="b">
                <mat-option value="a">Option A</mat-option>
                <mat-option value="b">Option B</mat-option>
                <mat-option value="c">Option C</mat-option>
              </mat-select>
            </mat-form-field>

          </div>
        </div>

        <!-- ── Rechte Spalte: IMR-Wrapper ────────────────────────────────── -->
        <div>
          <h3 style="margin: 0 0 1rem; font-size: .9rem; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: .05em">
            IMR Wrapper
          </h3>
          <div style="display: flex; flex-direction: column; gap: 1rem">

            <imr-form-field>
              <imr-label>Mit Label und Wert</imr-label>
              <input matInput value="Max Muster" />
            </imr-form-field>

            <imr-form-field>
              <imr-label>Leer (Label schwebt unten)</imr-label>
              <input matInput />
            </imr-form-field>

            <imr-form-field>
              <input matInput placeholder="Nur Placeholder, kein Label" />
            </imr-form-field>

            <imr-form-field hintLabel="* Pflichtfeld">
              <imr-label>Mit Hinweis</imr-label>
              <input matInput value="" />
            </imr-form-field>

            <imr-form-field hintLabel="* Pflichtfeld">
              <imr-label>Mit Fehler</imr-label>
              <input matInput [formControl]="errorControl2" />
              <imr-error>Dieses Feld ist erforderlich!</imr-error>
            </imr-form-field>

            <imr-form-field>
              <imr-label>Mit Suffix</imr-label>
              <input matInput value="max.muster" />
              <imr-suffix>@example.com</imr-suffix>
            </imr-form-field>

            <imr-form-field>
              <imr-label>Deaktiviert</imr-label>
              <input matInput value="readonly" disabled />
            </imr-form-field>

            <imr-form-field>
              <imr-label>Select-Feld</imr-label>
              <mat-select value="b">
                <mat-option value="a">Option A</mat-option>
                <mat-option value="b">Option B</mat-option>
                <mat-option value="c">Option C</mat-option>
              </mat-select>
            </imr-form-field>

          </div>
        </div>

      </div>
    `,
  }),
};
