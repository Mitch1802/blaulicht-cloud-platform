import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ImrExpansionPanelComponent } from './imr-expansion-panel.component';
import { ImrExpansionPanelHeaderComponent } from './imr-expansion-panel-header.component';
import { ImrPanelDescriptionComponent } from './imr-panel-description.component';
import { ImrPanelTitleComponent } from './imr-panel-title.component';

const meta: Meta<ImrExpansionPanelComponent> = {
  title: 'IMR UI Library/Wrappers/imr-expansion-panel',
  component: ImrExpansionPanelComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Wrapper für mat-expansion-panel mit IMR-Header-Slots über imr-panel-title und imr-panel-description.',
      },
    },
  },
  decorators: [
    moduleMetadata({ imports: [ImrExpansionPanelHeaderComponent, ImrPanelTitleComponent, ImrPanelDescriptionComponent] }),
    applicationConfig({ providers: [provideNoopAnimations()] }),
  ],
  args: {
    panelClass: '',
  },
};

export default meta;
type Story = StoryObj<ImrExpansionPanelComponent>;

export const MitHeader: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 760px; margin: 2rem auto;">
        <imr-expansion-panel [panelClass]="panelClass">
          <imr-panel-title>Gerätedetails</imr-panel-title>
          <imr-panel-description>zuletzt geprüft am 14.03.2026</imr-panel-description>
          <p>Hier stehen die erweiterten Informationen zum ausgewählten Datensatz.</p>
        </imr-expansion-panel>
      </div>
    `,
  }),
};

export const MitCustomHeader: Story = {
  render: () => ({
    template: `
      <div style="max-width: 760px; margin: 2rem auto;">
        <imr-expansion-panel>
          <imr-expansion-panel-header headerClass="custom-panel-header" collapsedHeight="56px" expandedHeight="64px">
            <strong>Eigener Header</strong>
            <span style="margin-left: auto; opacity: .72;">Prio hoch</span>
          </imr-expansion-panel-header>
          <p>Das Panel rendert den Header ueber den dedizierten Slot in der Parent-Struktur.</p>
        </imr-expansion-panel>
      </div>
    `,
  }),
};

export const OhneHeader: Story = {
  render: () => ({
    template: `
      <div style="max-width: 760px; margin: 2rem auto;">
        <imr-expansion-panel>
          <p>Das Panel kann auch ohne Titel-Slots als reiner Content-Container verwendet werden.</p>
        </imr-expansion-panel>
      </div>
    `,
  }),
};
