import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { MatCardModule } from '@angular/material/card';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ImrCardContentComponent } from './imr-card-content.component';

const meta: Meta<ImrCardContentComponent> = {
  title: 'IMR UI Library/Wrappers/imr-card-content',
  component: ImrCardContentComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Wrapper für mat-card-content mit optionaler CSS-Klasse für standardisierte Card-Inhalte.',
      },
    },
  },
  decorators: [
    moduleMetadata({ imports: [MatCardModule] }),
    applicationConfig({ providers: [provideNoopAnimations()] }),
  ],
  args: {
    contentClass: '',
  },
};

export default meta;
type Story = StoryObj<ImrCardContentComponent>;

export const Default: Story = {
  render: (args) => ({
    props: args,
    template: `
      <mat-card class="imr-card" style="max-width: 720px; margin: 2rem auto;">
        <div class="imr-card__head">
          <h2>Rechnungsdaten</h2>
        </div>
        <imr-card-content [contentClass]="contentClass">
          <p>Dieser Bereich verwendet den dedizierten IMR-Wrapper für Card-Inhalte.</p>
          <p>So bleiben Inhaltsslots im App-Code konsistent austauschbar.</p>
        </imr-card-content>
      </mat-card>
    `,
  }),
};

export const MitEigenerKlasse: Story = {
  args: {
    contentClass: 'imr-card__content',
  },
  render: (args) => ({
    props: args,
    template: `
      <mat-card class="imr-card" style="max-width: 720px; margin: 2rem auto;">
        <div class="imr-card__head">
          <h2>Benutzer verwalten</h2>
        </div>
        <imr-card-content [contentClass]="contentClass">
          <p>Die Wrapper-Komponente kann bestehende IMR-Klassen direkt übernehmen.</p>
        </imr-card-content>
      </mat-card>
    `,
  }),
};
