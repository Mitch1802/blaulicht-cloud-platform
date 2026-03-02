import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

const meta: Meta = {
  title: 'Design System/Patterns/Configuration Surface',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Referenz für Konfigurationsansicht: Card-Rahmen + Role-Chips im produktiven Look.',
      },
    },
  },
  decorators: [
    moduleMetadata({
      imports: [MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatChipsModule, MatIconModule],
    }),
    applicationConfig({
      providers: [provideNoopAnimations()],
    }),
  ],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => ({
    template: `
      <section class="app-page" style="max-width: 980px; margin: 0 auto;">
        <mat-card class="settings-card" style="margin-bottom: 1.1rem; border: 1px solid rgba(0,0,0,.14); background: rgba(255,255,255,.92);">
          <div class="section-head">
            <h2>Konfiguration</h2>
          </div>

          <mat-card-content>
            <form class="role-form">
              <mat-form-field class="full-width">
                <mat-label>Rolle</mat-label>
                <input matInput type="text" value="MASCHINIST" />
              </mat-form-field>

              <button mat-flat-button color="accent" type="button">Rolle speichern</button>

              <mat-chip-set class="role-chips">
                <mat-chip removable="true">MASCHINIST <mat-icon matChipRemove>cancel</mat-icon></mat-chip>
                <mat-chip removable="true">ATS-WART <mat-icon matChipRemove>cancel</mat-icon></mat-chip>
                <mat-chip removable="true">JUGENDBETREUER <mat-icon matChipRemove>cancel</mat-icon></mat-chip>
              </mat-chip-set>
            </form>
          </mat-card-content>
        </mat-card>
      </section>
    `,
  }),
};
