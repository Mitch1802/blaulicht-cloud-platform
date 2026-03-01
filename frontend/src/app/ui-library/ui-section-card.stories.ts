import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { UiSectionCardComponent } from './ui-section-card.component';

const meta: Meta<UiSectionCardComponent> = {
  title: 'Design System/Layout/Section Card',
  component: UiSectionCardComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Einheitliche Card-Struktur für Modulbereiche mit Titel, optionalen Aktionen und Content-Zone.',
      },
    },
  },
  decorators: [
    moduleMetadata({
      imports: [MatButtonModule, MatFormFieldModule, MatInputModule, MatTableModule],
    }),
    applicationConfig({
      providers: [provideNoopAnimations()],
    }),
  ],
  args: {
    title: 'Bereichstitel',
  },
};

export default meta;
type Story = StoryObj<UiSectionCardComponent>;

export const Default: Story = {
  render: (args) => ({
    props: args,
    template: `
      <ui-section-card [title]="title">
        <div class="app-grid ui-form-grid">
          <div class="app-col-12 ui-two-col-md">
            <mat-form-field class="ui-full-width">
              <mat-label>Datum</mat-label>
              <input matInput />
            </mat-form-field>
          </div>
          <div class="app-col-12 ui-two-col-md">
            <mat-form-field class="ui-full-width">
              <mat-label>Ort</mat-label>
              <input matInput />
            </mat-form-field>
          </div>
        </div>
      </ui-section-card>
    `,
  }),
};

export const WithActionsAndTable: Story = {
  args: {
    title: 'Anwesenheitslisten verwalten',
  },
  render: (args) => ({
    props: args,
    template: `
      <ui-section-card [title]="title">
        <div uiCardActions>
          <button mat-flat-button color="primary" type="button">Hinzufügen</button>
        </div>

        <div class="ui-top-actions">
          <mat-form-field>
            <mat-label>Suchen</mat-label>
            <input matInput />
          </mat-form-field>
        </div>

        <div class="ui-table-wrap">
          <table mat-table [dataSource]="[]">
            <ng-container matColumnDef="col1">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let row">{{ row?.name }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="['col1']"></tr>
            <tr mat-row *matRowDef="let row; columns: ['col1']"></tr>
          </table>
        </div>
      </ui-section-card>
    `,
  }),
};
