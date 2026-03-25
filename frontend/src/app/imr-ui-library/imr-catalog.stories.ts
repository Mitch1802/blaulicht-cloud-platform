import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ImrPageLayoutComponent } from './imr-page-layout.component';
import { ImrSectionCardComponent } from './imr-section-card.component';
import { ImrTopActionsComponent } from './imr-top-actions.component';
import { ImrTableWrapComponent } from './imr-table-wrap.component';
import { ImrChipsComponent } from './imr-chips.component';
import { ImrFormGridComponent } from './imr-form-grid.component';
import { ImrFormFieldComponent } from './imr-form-field.component';
import { ImrLabelComponent } from './imr-label.component';

/**
 * Vollständiger IMR-Komponenten-Katalog.
 * Demonstriert alle IMR-Komponenten im Zusammenspiel.
 */
const meta: Meta = {
  title: 'IMR UI Library/Katalog/Vollständiger Katalog',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# IMR UI Library – Komponenten-Katalog

Übersicht aller verfügbaren IMR-Komponenten mit typischen Verwendungsbeispielen.

| Komponente | Selektor | Zweck |
|---|---|---|
| Page Layout | \`<imr-page-layout>\` | Äußerer Seitenrahmen mit h1 und optionalen Actions |
| Section Card | \`<imr-section-card>\` | Card mit Kopfbereich, Titel, Aktionen und Content |
| Header | \`<imr-header>\` | App-Toolbar mit Logo, Titel, Breadcrumb |
| Top Actions | \`<imr-top-actions>\` | Aktionsleiste oben (Filter, Buttons) |
| Table Wrap | \`<imr-table-wrap>\` | Scrollbarer Tabellen-Container |
| Chips | \`<imr-chips>\` | Container für mat-chip Elemente |
| Form Grid | \`<imr-form-grid>\` | 12-Spalten-Grid für Formularfelder |
        `,
      },
    },
  },
  decorators: [
    moduleMetadata({
      imports: [
        ImrPageLayoutComponent, ImrSectionCardComponent, ImrTopActionsComponent,
        ImrTableWrapComponent, ImrChipsComponent, ImrFormGridComponent,
        ImrFormFieldComponent, ImrLabelComponent,
        MatButtonModule, MatFormFieldModule, MatInputModule, MatTableModule,
        MatChipsModule, MatIconModule, MatPaginatorModule,
      ],
    }),
    applicationConfig({ providers: [provideNoopAnimations()] }),
  ],
};

export default meta;

export const Listenseite: StoryObj = {
  name: 'Typische Listenseite',
  render: () => ({
    template: `
      <imr-page-layout title="Mitglieder">
        <div imrPageActions>
          <button mat-flat-button color="accent">Exportieren</button>
        </div>

        <imr-section-card title="Mitglieder verwalten">
          <div imrCardActions>
            <button mat-flat-button color="primary">Hinzufügen</button>
          </div>

          <imr-top-actions>
            <mat-form-field style="max-width:280px">
              <mat-label>Filter</mat-label>
              <input matInput placeholder="Suchen..." />
            </mat-form-field>
          </imr-top-actions>

          <imr-table-wrap>
            <table mat-table [dataSource]="[{name:'Max Muster', rolle:'MITGLIED'},{name:'Anna Admin', rolle:'ADMIN'}]">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let r">{{ r.name }}</td>
              </ng-container>
              <ng-container matColumnDef="rolle">
                <th mat-header-cell *matHeaderCellDef>Rolle</th>
                <td mat-cell *matCellDef="let r">{{ r.rolle }}</td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Aktionen</th>
                <td mat-cell *matCellDef="let r" class="imr-action-cell">
                  <button mat-flat-button color="primary" class="imr-action-btn">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-flat-button color="warn" class="imr-action-btn">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="['name','rolle','actions']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['name','rolle','actions']"></tr>
            </table>
            <mat-paginator [pageSizeOptions]="[10,50,100]" showFirstLastButtons></mat-paginator>
          </imr-table-wrap>
        </imr-section-card>
      </imr-page-layout>
    `,
  }),
};

export const Formularseite: StoryObj = {
  name: 'Typische Formularseite',
  render: () => ({
    template: `
      <imr-page-layout title="Mitglied bearbeiten">
        <imr-section-card title="Persönliche Daten">
          <imr-form-grid>
            <div class="app-col-12 app-col-lg-6">
              <imr-form-field>
                <imr-label>Vorname</imr-label>
                <input matInput value="Max" />
              </imr-form-field>
            </div>
            <div class="app-col-12 app-col-lg-6">
              <imr-form-field>
                <imr-label>Nachname</imr-label>
                <input matInput value="Muster" />
              </imr-form-field>
            </div>
            <div class="app-col-12 app-col-lg-6">
              <imr-form-field>
                <imr-label>E-Mail</imr-label>
                <input matInput type="email" value="max@example.com" />
              </imr-form-field>
            </div>
          </imr-form-grid>

          <imr-top-actions>
            <button mat-flat-button color="accent" type="submit">Speichern</button>
            <button mat-flat-button color="primary" type="button">Abbrechen</button>
          </imr-top-actions>
        </imr-section-card>

        <imr-section-card title="Rollen" style="margin-top: 1rem; display: block">
          <imr-chips>
            <mat-chip-set>
              <mat-chip>MITGLIED</mat-chip>
              <mat-chip>ATEMSCHUTZ</mat-chip>
            </mat-chip-set>
          </imr-chips>
        </imr-section-card>
      </imr-page-layout>
    `,
  }),
};
