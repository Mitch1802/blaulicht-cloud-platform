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
        component: 'Tabellen-Pattern mit ui-table-wrap, ui-action-cell, ui-action-btn und optionalem Transaction-Modal-Flow.',
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

export const TableWithTransactionModal: Story = {
  render: () => ({
    props: {
      dataSource: [
        { artikel: 'Helmlampe', status: '2/6 verliehen (1 Entlehner)' },
        { artikel: 'Ladegerät', status: '3/3 verliehen (2 Entlehner)' },
      ],
      displayedColumns: ['artikel', 'status', 'actions'],
    },
    template: `
      <div style="max-width: 980px;">
        <div class="ui-table-wrap">
          <table mat-table [dataSource]="dataSource">
            <ng-container matColumnDef="artikel">
              <th mat-header-cell *matHeaderCellDef>Artikel</th>
              <td mat-cell *matCellDef="let row">{{ row.artikel }}</td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let row">{{ row.status }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Aktionen</th>
              <td mat-cell *matCellDef="let row" class="ui-action-cell">
                <button mat-flat-button color="primary" class="ui-action-btn" type="button" aria-label="Ausborgen">
                  <mat-icon>assignment_returned</mat-icon>
                </button>
                <button mat-flat-button color="warn" class="ui-action-btn" type="button" aria-label="Rueckgabe">
                  <mat-icon>assignment_turned_in</mat-icon>
                </button>
                <button mat-flat-button color="primary" class="ui-action-btn" type="button" aria-label="Bearbeiten">
                  <mat-icon>edit</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        </div>

        <div class="ui-transaction-backdrop" style="position: relative; inset: auto; padding: 0; margin-top: 1rem; background: transparent;">
          <section class="ui-transaction-dialog" style="width: 100%; max-height: none; box-shadow: none; border: 1px solid rgba(0,0,0,.14);">
            <header class="ui-transaction-head">
              <h3>Inventar ausborgen</h3>
              <button mat-icon-button type="button" aria-label="Schliessen">
                <mat-icon>close</mat-icon>
              </button>
            </header>

            <p class="ui-transaction-meta"><strong>Helmlampe</strong></p>
            <p class="ui-transaction-meta">Verfuegbar aktuell: 4 | Rest nach Eingabe: 3</p>

            <form class="ui-transaction-form">
              <mat-form-field class="ui-full-width">
                <mat-label>Entlehner</mat-label>
                <input matInput value="Max Mustermann" />
              </mat-form-field>

              <mat-form-field class="ui-full-width">
                <mat-label>Anzahl</mat-label>
                <input matInput type="number" value="1" />
              </mat-form-field>

              <div class="ui-transaction-actions">
                <button mat-flat-button color="primary" type="button">Abbrechen</button>
                <button mat-flat-button color="accent" type="button">Ausborgen speichern</button>
              </div>
            </form>
          </section>
        </div>
      </div>
    `,
  }),
};
