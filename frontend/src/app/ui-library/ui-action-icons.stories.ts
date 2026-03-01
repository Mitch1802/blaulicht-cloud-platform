import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import uiCatalog from './ui-element-catalog.json';

const actionIcons = (uiCatalog.actionIcons ?? []).slice().sort();

const meta: Meta = {
  title: 'Design System/Catalog/Allowed Action Icons',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Verbindliche Allowlist für Action-Icons in Tabellen-Aktionsspalten. Quelle: ui-element-catalog.json > actionIcons.',
      },
    },
  },
  decorators: [
    moduleMetadata({
      imports: [MatButtonModule, MatCardModule, MatIconModule],
    }),
    applicationConfig({
      providers: [provideNoopAnimations()],
    }),
  ],
};

export default meta;
type Story = StoryObj;

export const IconAllowlist: Story = {
  render: () => ({
    props: {
      icons: actionIcons,
    },
    template: `
      <mat-card class="settings-card" style="max-width: 980px;">
        <mat-card-header>
          <mat-card-title>Allowed Action Icons</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p style="margin: 0 0 .75rem; color: rgba(0,0,0,.72);">
            Diese Icons sind in <strong>actions</strong>-Tabellenspalten erlaubt.
          </p>

          <div class="ui-table-wrap">
            <table mat-table [dataSource]="icons" style="width:100%;">
              <ng-container matColumnDef="icon">
                <th mat-header-cell *matHeaderCellDef>Icon Name</th>
                <td mat-cell *matCellDef="let icon"><code>{{ icon }}</code></td>
              </ng-container>

              <ng-container matColumnDef="previewPrimary">
                <th mat-header-cell *matHeaderCellDef>Preview Primary</th>
                <td mat-cell *matCellDef="let icon" class="ui-action-cell">
                  <button mat-flat-button color="primary" class="ui-action-btn" type="button" aria-label="primary preview">
                    <mat-icon class="m-0">{{ icon }}</mat-icon>
                  </button>
                </td>
              </ng-container>

              <ng-container matColumnDef="previewWarn">
                <th mat-header-cell *matHeaderCellDef>Preview Warn</th>
                <td mat-cell *matCellDef="let icon" class="ui-action-cell">
                  <button mat-flat-button color="warn" class="ui-action-btn" type="button" aria-label="warn preview">
                    <mat-icon class="m-0">{{ icon }}</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="['icon', 'previewPrimary', 'previewWarn']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['icon', 'previewPrimary', 'previewWarn']"></tr>
            </table>
          </div>
        </mat-card-content>
      </mat-card>
    `,
  }),
};
