import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { MatButtonModule } from '@angular/material/button';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ImrStepComponent } from './imr-step.component';
import { ImrStepperComponent } from './imr-stepper.component';

const meta: Meta<ImrStepperComponent> = {
  title: 'IMR UI Library/Wrappers/imr-stepper',
  component: ImrStepperComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Wrapper für mat-stepper zusammen mit imr-step für mehrstufige Abläufe.',
      },
    },
  },
  decorators: [
    moduleMetadata({ imports: [ImrStepComponent, MatButtonModule] }),
    applicationConfig({ providers: [provideNoopAnimations()] }),
  ],
  args: {
    linear: false,
    selectedIndex: 0,
    orientation: 'horizontal',
  },
};

export default meta;
type Story = StoryObj<ImrStepperComponent>;

export const Default: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 960px; margin: 2rem auto;">
        <imr-stepper [linear]="linear" [selectedIndex]="selectedIndex" [orientation]="orientation">
          <imr-step label="Basisdaten">
            <p>Erfasse die Stammdaten des Geräts.</p>
            <button mat-flat-button color="primary" type="button">Weiter</button>
          </imr-step>
          <imr-step label="Prüfung" [optional]="true">
            <p>Dokumentiere den Prüfstatus und ergänze Notizen.</p>
          </imr-step>
          <imr-step label="Abschluss">
            <p>Bestätige die Eingaben und speichere den Vorgang.</p>
          </imr-step>
        </imr-stepper>
      </div>
    `,
  }),
};

export const Vertikal: Story = {
  args: {
    orientation: 'vertical',
    selectedIndex: 1,
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 640px; margin: 2rem auto;">
        <imr-stepper [selectedIndex]="selectedIndex" [orientation]="orientation">
          <imr-step label="Kontakt">Kontakt auswählen</imr-step>
          <imr-step label="Vorlage">Vorlage wählen</imr-step>
          <imr-step label="Export">PDF erzeugen</imr-step>
        </imr-stepper>
      </div>
    `,
  }),
};
