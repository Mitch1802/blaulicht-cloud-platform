import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

const meta: Meta = {
  title: 'Design System/Patterns/Form',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Form-Patterns für globale Utility-Klassen wie ui-form-grid, ui-two-col-md, ui-actions und ui-chips.',
      },
    },
  },
  argTypes: {
    title: { control: 'text' },
    withChips: { control: 'boolean' },
  },
  args: {
    title: 'Beispiel-Formular',
    withChips: true,
  },
  decorators: [
    moduleMetadata({
      imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatChipsModule, MatIconModule],
    }),
    applicationConfig({
      providers: [provideNoopAnimations()],
    }),
  ],
};

export default meta;
type Story = StoryObj;

export const StandardFormLayout: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div class="ui-card" style="padding:1rem; border:1px solid #d5dbe4;">
        <h3 style="margin-top:0;">{{ title }}</h3>

        <section class="app-grid ui-form-grid">
          <div class="app-col-12">
            <mat-form-field class="ui-full-width" hintLabel="* Pflichtfeld">
              <mat-label>Titel</mat-label>
              <input matInput />
            </mat-form-field>
          </div>

          <div class="app-col-12 ui-two-col-md">
            <mat-form-field class="ui-full-width">
              <mat-label>Datum</mat-label>
              <input matInput placeholder="TT.MM.JJJJ" />
            </mat-form-field>
          </div>

          <div class="app-col-12 ui-two-col-md">
            <mat-form-field class="ui-full-width">
              <mat-label>Ort</mat-label>
              <input matInput />
            </mat-form-field>
          </div>

          <div class="app-col-12">
            <mat-form-field class="ui-full-width">
              <mat-label>Notiz</mat-label>
              <textarea matInput rows="4"></textarea>
            </mat-form-field>
          </div>
        </section>

        @if (withChips) {
          <mat-chip-set class="ui-chips">
            <mat-chip removable="true">123 - Max Mustermann <mat-icon matChipRemove>cancel</mat-icon></mat-chip>
            <mat-chip removable="true">456 - Anna Muster <mat-icon matChipRemove>cancel</mat-icon></mat-chip>
          </mat-chip-set>
        }

        <div class="ui-actions" style="margin-top: .8rem;">
          <button mat-flat-button color="accent" type="button">Speichern</button>
          <button mat-flat-button color="primary" type="button">Abbrechen</button>
        </div>
      </div>
    `,
  }),
};
