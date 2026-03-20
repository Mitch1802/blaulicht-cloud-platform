import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
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
outline appearance with 4 px rounded corners, standard Angular Material sizing, floating label, and IMR theme colours.

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
        MatInputModule,
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
