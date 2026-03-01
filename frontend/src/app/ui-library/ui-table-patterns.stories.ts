import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

const meta: Meta = {
  title: 'Design System/Patterns/Table',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Tabellen-Pattern mit ui-table-wrap, ui-action-cell und ui-action-btn.',
      },
    },
  },
  decorators: [
    moduleMetadata({
      imports: [MatTableModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
    }),
    applicationConfig({
      providers: [provideNoopAnimations()],
    }),
  ],
};

export default meta;
type Story = StoryObj;

const rows = [
  { mitglieder: '123 - Max Mustermann', datum: '01.03.2026', titel: 'Monatsübung', ort: 'Feuerwehrhaus' },
  { mitglieder: '456 - Anna Muster', datum: '15.03.2026', titel: 'Schulung', ort: 'Lehrsaal' },
];

export const StandardTable: Story = {
  render: () => ({
    props: {
      dataSource: rows,
      displayedColumns: ['mitglieder', 'datum', 'titel', 'ort', 'actions'],
    },
    template: `
      <div class="ui-table-wrap">
        <mat-form-field>
          <mat-label>Suchen</mat-label>
          <input matInput />
        </mat-form-field>

        <table mat-table [dataSource]="dataSource">
          <ng-container matColumnDef="mitglieder">
            <th mat-header-cell *matHeaderCellDef>Mitglieder</th>
            <td mat-cell *matCellDef="let row">{{ row.mitglieder }}</td>
          </ng-container>

          <ng-container matColumnDef="datum">
            <th mat-header-cell *matHeaderCellDef>Datum</th>
            <td mat-cell *matCellDef="let row">{{ row.datum }}</td>
          </ng-container>

          <ng-container matColumnDef="titel">
            <th mat-header-cell *matHeaderCellDef>Titel</th>
            <td mat-cell *matCellDef="let row">{{ row.titel }}</td>
          </ng-container>

          <ng-container matColumnDef="ort">
            <th mat-header-cell *matHeaderCellDef>Ort</th>
            <td mat-cell *matCellDef="let row">{{ row.ort }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Aktionen</th>
            <td mat-cell *matCellDef="let row" class="ui-action-cell">
              <button mat-flat-button color="primary" class="ui-action-btn" type="button">
                <mat-icon>edit</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </div>
    `,
  }),
};
