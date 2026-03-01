import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { MatButtonModule } from '@angular/material/button';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { UiPageLayoutComponent } from './ui-page-layout.component';

const meta: Meta<UiPageLayoutComponent> = {
  title: 'Design System/Layout/Page Layout',
  component: UiPageLayoutComponent,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Standardisierter Seiten-Container mit Headerbereich und optionalen Header-Actions.',
      },
    },
  },
  decorators: [
    moduleMetadata({
      imports: [MatButtonModule],
    }),
    applicationConfig({
      providers: [provideNoopAnimations()],
    }),
  ],
  args: {
    title: 'Seitenüberschrift',
  },
};

export default meta;
type Story = StoryObj<UiPageLayoutComponent>;

export const Default: Story = {
  render: (args) => ({
    props: args,
    template: `
      <ui-page-layout [title]="title">
        <div style="padding: 1rem; border: 1px dashed #c7cdd8; border-radius: .5rem; background: rgba(255,255,255,.6)">
          Seiteninhalt innerhalb des standardisierten Layout-Containers.
        </div>
      </ui-page-layout>
    `,
  }),
};

export const WithHeaderActions: Story = {
  args: {
    title: 'Anwesenheitsliste',
  },
  render: (args) => ({
    props: args,
    template: `
      <ui-page-layout [title]="title">
        <div uiPageActions style="display:flex; gap:.5rem; align-items:center;">
          <button mat-flat-button color="primary" type="button">Neu</button>
          <button mat-flat-button color="accent" type="button">Export</button>
        </div>

        <div style="padding: 1rem; border: 1px dashed #c7cdd8; border-radius: .5rem; background: rgba(255,255,255,.6)">
          Inhalt mit Actions im Headerbereich.
        </div>
      </ui-page-layout>
    `,
  }),
};
