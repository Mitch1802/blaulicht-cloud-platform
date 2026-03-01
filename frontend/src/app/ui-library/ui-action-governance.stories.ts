import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

const meta: Meta = {
  title: 'Design System/Catalog/Action Governance',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Dokumentiert, welche Action-Patterns erlaubt sind und welche vom Validator blockiert werden. Diese Story dient nur der Team-Kommunikation.',
      },
    },
  },
  decorators: [
    moduleMetadata({
      imports: [MatCardModule, MatIconModule, MatTableModule],
    }),
    applicationConfig({
      providers: [provideNoopAnimations()],
    }),
  ],
};

export default meta;
type Story = StoryObj;

export const InvalidExamples: Story = {
  render: () => ({
    props: {
      displayedColumns: ['rule', 'bad'],
      invalidRows: [
        { rule: 'Actions-Spalte ohne ui-action-cell', bad: '<td mat-cell ...>' },
        {
          rule: 'Material-Button mit Spacing-Utility (z. B. ms-2, px-0)',
          bad: '<button mat-flat-button class="ms-2">...</button>',
        },
        { rule: 'Actions-Button ohne mat-icon', bad: '<button mat-flat-button color="primary">Edit</button>' },
        {
          rule: 'Actions-Button mit nicht erlaubter Farbe',
          bad: '<button mat-flat-button color="accent">...</button>',
        },
        { rule: 'Actions-Icon nicht in actionIcons-Allowlist', bad: '<mat-icon>home</mat-icon>' },
      ],
    },
    template: `
      <mat-card class="settings-card" style="max-width: 980px;">
        <mat-card-header>
          <mat-card-title>Invalid Examples (Validator Blocked)</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p style="margin: 0 0 1rem; color: rgba(0,0,0,.72);">
            Die folgenden Muster sind bewusst <strong>nicht erlaubt</strong> und werden durch
            <code>verify:ui-catalog</code> geblockt.
          </p>

          <div class="ui-table-wrap">
            <table mat-table [dataSource]="invalidRows" style="width:100%;">
              <ng-container matColumnDef="rule">
                <th mat-header-cell *matHeaderCellDef>Regel</th>
                <td mat-cell *matCellDef="let row">{{ row.rule }}</td>
              </ng-container>

              <ng-container matColumnDef="bad">
                <th mat-header-cell *matHeaderCellDef>Beispiel (verboten)</th>
                <td mat-cell *matCellDef="let row"><code>{{ row.bad }}</code></td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>
          </div>

          <div style="margin-top: 1rem; color: rgba(0,0,0,.72);">
            <strong>Hinweis:</strong> Für gültige Beispiele siehe
            <em>Design System/Catalog/Allowed Action Icons</em> und
            <em>Design System/Patterns/Table</em>.
          </div>
        </mat-card-content>
      </mat-card>
    `,
  }),
};
