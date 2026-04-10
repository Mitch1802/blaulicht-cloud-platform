import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { MatButtonModule } from '@angular/material/button';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ImrPageLayoutComponent } from './imr-page-layout/imr-page-layout.component';

const meta: Meta<ImrPageLayoutComponent> = {
  title: 'IMR UI Library/Layout/imr-page-layout',
  component: ImrPageLayoutComponent,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
**\`<imr-page-layout>\`** ist der standardisierte Seiten-Container der IMR UI Library.

Er stellt den äußeren Rahmen einer Seite mit Überschrift (h1) bereit.

Das gesamte Styling (max-width, Padding, Typografie) ist in \`imr-catalog.sass\` definiert
und wird automatisch über CSS-Variablen angewendet.

### Verwendung
\`\`\`html
<imr-page-layout title="Meine Seite">
  <!-- Seiteninhalt -->
</imr-page-layout>
\`\`\`
        `,
      },
    },
  },
  decorators: [
    moduleMetadata({ imports: [MatButtonModule] }),
    applicationConfig({ providers: [provideNoopAnimations()] }),
  ],
  args: {
    title: 'Seitenüberschrift',
  },
};

export default meta;
type Story = StoryObj<ImrPageLayoutComponent>;

export const Default: Story = {
  render: (args) => ({
    props: args,
    template: `
      <imr-page-layout [title]="title">
        <div style="padding: 1rem; border: 1px dashed #c7cdd8; border-radius: .5rem; background: rgba(255,255,255,.6)">
          Seiteninhalt innerhalb des standardisierten IMR-Layout-Containers.
        </div>
      </imr-page-layout>
    `,
  }),
};

export const MitTitelUndInhalt: Story = {
  args: { title: 'Anwesenheitsliste' },
  render: (args) => ({
    props: args,
    template: `
      <imr-page-layout [title]="title">
        <div style="padding: 1rem; border: 1px dashed #c7cdd8; border-radius: .5rem; background: rgba(255,255,255,.6)">
          Inhalt mit Seitenkopf ohne dedizierten Action-Slot.
        </div>
      </imr-page-layout>
    `,
  }),
};

