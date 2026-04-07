import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ImrSectionCardComponent } from './imr-section-card.component';

const meta: Meta<ImrSectionCardComponent> = {
  title: 'IMR UI Library/Layout/imr-section-card',
  component: ImrSectionCardComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**\`<imr-section-card>\`** ist die einheitliche Card-Struktur für Modulbereiche.

Sie kapselt \`mat-card\` mit standardisiertem Kopfbereich
und einem Content-Bereich. Das komplette Styling kommt aus \`imr-catalog.sass\`.

### Verwendung
\`\`\`html
<imr-section-card title="Benutzer verwalten">
  <!-- Karteninhalt -->
</imr-section-card>
\`\`\`
        `,
      },
    },
  },
  decorators: [
    moduleMetadata({ imports: [MatButtonModule, MatFormFieldModule, MatInputModule, MatTableModule] }),
    applicationConfig({ providers: [provideNoopAnimations()] }),
  ],
  args: { title: 'Bereichstitel' },
};

export default meta;
type Story = StoryObj<ImrSectionCardComponent>;

export const Default: Story = {
  render: (args) => ({
    props: args,
    template: `
      <imr-section-card [title]="title">
        <div class="app-grid imr-form-grid">
          <div class="app-col-12 imr-two-col-md">
            <mat-form-field class="imr-full-width">
              <mat-label>Datum</mat-label>
              <input matInput />
            </mat-form-field>
          </div>
          <div class="app-col-12 imr-two-col-md">
            <mat-form-field class="imr-full-width">
              <mat-label>Ort</mat-label>
              <input matInput />
            </mat-form-field>
          </div>
        </div>
      </imr-section-card>
    `,
  }),
};

export const MitTopActionsUndTabelle: Story = {
  args: { title: 'Datensätze verwalten' },
  render: (args) => ({
    props: args,
    template: `
      <imr-section-card [title]="title">
        <imr-top-actions>
          <button mat-flat-button color="primary">Hinzufügen</button>
          <mat-form-field>
            <mat-label>Suchen</mat-label>
            <input matInput />
          </mat-form-field>
        </imr-top-actions>
        <div class="imr-table-wrap">
          <table mat-table [dataSource]="[]">
            <ng-container matColumnDef="col1">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let row">{{ row?.name }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="['col1']"></tr>
            <tr mat-row *matRowDef="let row; columns: ['col1']"></tr>
          </table>
        </div>
      </imr-section-card>
    `,
  }),
};

export const OhneTitel: Story = {
  args: { title: '' },
  render: (args) => ({
    props: args,
    template: `
      <imr-section-card>
        <p>Card ohne Titel – der Kopfbereich wird ausgeblendet.</p>
      </imr-section-card>
    `,
  }),
};
