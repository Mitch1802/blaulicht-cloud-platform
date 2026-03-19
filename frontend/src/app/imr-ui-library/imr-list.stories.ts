import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ImrListComponent } from './imr-list.component';
import { ImrListItemComponent } from './imr-list-item.component';

const meta: Meta<ImrListComponent> = {
  title: 'IMR UI Library/Wrappers/imr-list',
  component: ImrListComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Wrapper für mat-list inklusive Zusammenspiel mit imr-list-item für gleichförmige Listenzeilen.',
      },
    },
  },
  decorators: [
    moduleMetadata({ imports: [ImrListItemComponent, MatButtonModule, MatIconModule] }),
    applicationConfig({ providers: [provideNoopAnimations()] }),
  ],
  args: {
    listClass: '',
  },
};

export default meta;
type Story = StoryObj<ImrListComponent>;

export const Default: Story = {
  render: (args) => ({
    props: args,
    template: `
      <imr-list [listClass]="listClass" style="max-width: 760px; display:block; margin: 2rem auto;">
        <imr-list-item itemClass="app-grid">
          <div class="app-col-8">Tragkraftspritze</div>
          <div class="app-col-4">einsatzbereit</div>
        </imr-list-item>
        <imr-list-item itemClass="app-grid">
          <div class="app-col-8">Lichtmast</div>
          <div class="app-col-4">wartet auf Prüfung</div>
        </imr-list-item>
      </imr-list>
    `,
  }),
};

export const MitAktionsspalte: Story = {
  render: () => ({
    template: `
      <imr-list style="max-width: 760px; display:block; margin: 2rem auto;">
        <imr-list-item itemClass="app-grid">
          <div class="app-col-7">Position A</div>
          <div class="app-col-3">12,50 EUR</div>
          <div class="app-col-2 text-end">
            <button mat-flat-button color="warn" class="imr-action-btn" type="button" aria-label="Position entfernen">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </imr-list-item>
      </imr-list>
    `,
  }),
};
