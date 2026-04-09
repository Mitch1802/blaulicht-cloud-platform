import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ImrToolbarComponent } from './imr-toolbar/imr-toolbar.component';

const meta: Meta<ImrToolbarComponent> = {
  title: 'IMR UI Library/Wrappers/imr-toolbar',
  component: ImrToolbarComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Wrapper für mat-toolbar, damit Toolbar-Strukturen einheitlich über die IMR-Library laufen.',
      },
    },
  },
  decorators: [
    moduleMetadata({ imports: [MatButtonModule, MatIconModule] }),
    applicationConfig({ providers: [provideNoopAnimations()] }),
  ],
  args: {
    toolbarClass: 'imr-header-toolbar',
  },
};

export default meta;
type Story = StoryObj<ImrToolbarComponent>;

export const Default: Story = {
  render: (args) => ({
    props: args,
    template: `
      <imr-toolbar [toolbarClass]="toolbarClass" style="display:block; margin: 2rem auto; max-width: 960px;">
        <strong>Blaulicht Cloud</strong>
        <span style="flex: 1 1 auto;"></span>
        <button mat-icon-button type="button" aria-label="Benachrichtigungen">
          <mat-icon>notifications</mat-icon>
        </button>
      </imr-toolbar>
    `,
  }),
};

export const MitMehrerenAktionen: Story = {
  render: () => ({
    template: `
      <imr-toolbar toolbarClass="imr-header-toolbar" style="display:block; margin: 2rem auto; max-width: 960px;">
        <strong>Verwaltung</strong>
        <span style="flex: 1 1 auto;"></span>
        <button mat-flat-button color="primary" type="button">Speichern</button>
        <button mat-icon-button type="button" aria-label="Suche">
          <mat-icon>search</mat-icon>
        </button>
      </imr-toolbar>
    `,
  }),
};
