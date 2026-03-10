import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

const meta: Meta = {
  title: 'Design System/Catalog/All App Elements',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Katalogstory für alle aktuell in der App verwendeten Material-Elemente und globalen UI-/Layout-Klassen.',
      },
    },
  },
  decorators: [
    moduleMetadata({
      imports: [
        ReactiveFormsModule,
        MatAutocompleteModule,
        MatButtonModule,
        MatCardModule,
        MatCheckboxModule,
        MatChipsModule,
        MatDividerModule,
        MatExpansionModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatListModule,
        MatPaginatorModule,
        MatProgressBarModule,
        MatSelectModule,
        MatStepperModule,
        MatTabsModule,
        MatToolbarModule,
      ],
    }),
    applicationConfig({
      providers: [provideNoopAnimations()],
    }),
  ],
};

export default meta;
type Story = StoryObj;

export const AllElements: Story = {
  render: () => ({
    props: {
      selectControl: new FormControl('eins'),
      multiSelectControl: new FormControl(['eins', 'zwei']),
      autoControl: new FormControl(''),
      options: ['eins', 'zwei', 'drei'],
      displayedColumns: ['name', 'action'],
      dataSource: [{ name: 'Element A' }, { name: 'Element B' }],
    },
    template: `
      <section class="ui-page">
        <mat-toolbar
          class="app-header-toolbar"
          style="--mat-toolbar-container-background-color: var(--mat-sys-primary, #005cbb); --mat-toolbar-container-text-color: #fff; padding-inline: .65rem .85rem;"
        >
          <img
            src="assets/images/icon.svg"
            alt="Logo"
            style="width:42px;height:42px;border-radius:.5rem;object-fit:contain;"
          />
          <span class="title app-header-title" style="margin-left:.7rem;line-height:1;white-space:nowrap;">Blaulicht Cloud</span>
          <span class="spacer"></span>
          <button mat-icon-button type="button" aria-label="Abmelden" style="color:#fff;">
            <mat-icon>logout</mat-icon>
          </button>
        </mat-toolbar>

        <mat-progress-bar mode="indeterminate"></mat-progress-bar>

        <div class="app-header-stepper-wrap" style="padding:.42rem .55rem;">
          <nav class="app-header-breadcrumb" aria-label="Breadcrumb" style="display:flex;align-items:center;gap:.45rem;white-space:nowrap;overflow-x:auto;">
            <a class="breadcrumb-item breadcrumb-link breadcrumb-home" aria-label="Startseite" style="display:inline-flex;align-items:center;text-decoration:none;">
              <mat-icon style="font-size:18px;width:18px;height:18px;">home</mat-icon>
            </a>
            <span class="breadcrumb-separator" aria-hidden="true">&gt;</span>
            <a class="breadcrumb-item breadcrumb-link" style="text-decoration:none;">Einsatzberichte</a>
            <span class="breadcrumb-separator" aria-hidden="true">&gt;</span>
            <span class="breadcrumb-item">Neu</span>
          </nav>
        </div>

        <header class="page-head">
          <h1>UI Element-Katalog</h1>
        </header>

        <mat-card class="settings-card">
          <mat-card-header>
            <mat-card-title>Material + Layout Übersicht</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="section-head">
              <h2>Form Controls</h2>
            </div>
            <div class="top-actions actions-row">
              <button mat-flat-button color="primary" type="button">Primary</button>
              <button mat-flat-button color="accent" type="button">Accent</button>
              <button mat-flat-button color="warn" type="button">Warn</button>
            </div>

            <section class="app-grid form-grid ui-form-grid selector-row">
              <div class="app-col-12 ui-two-col-md">
                <mat-form-field class="full-width ui-full-width">
                  <mat-label>Select</mat-label>
                  <mat-select [formControl]="selectControl">
                    @for (opt of options; track opt) {
                      <mat-option [value]="opt">{{ opt }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="app-col-12 ui-two-col-md">
                <mat-form-field class="full-width ui-full-width">
                  <mat-label>Autocomplete</mat-label>
                  <input matInput [formControl]="autoControl" [matAutocomplete]="auto" />
                  <mat-autocomplete #auto="matAutocomplete">
                    @for (opt of options; track opt) {
                      <mat-option [value]="opt">{{ opt }}</mat-option>
                    }
                  </mat-autocomplete>
                </mat-form-field>
              </div>

              <div class="app-col-12 ui-two-col-md">
                <mat-form-field class="full-width ui-full-width">
                  <mat-label>Multi-Select mit Counter</mat-label>
                  <mat-select [formControl]="multiSelectControl" multiple>
                    <mat-select-trigger>
                      {{ multiSelectControl.value?.[0] || 'Keine Auswahl' }}
                      @if ((multiSelectControl.value?.length || 0) > 1) {
                        <span style="font-size:.78rem; opacity:.72; margin-left:.25rem;">(+{{ (multiSelectControl.value?.length || 0) - 1 }})</span>
                      }
                    </mat-select-trigger>
                    @for (opt of options; track opt) {
                      <mat-option [value]="opt">{{ opt }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="app-col-12 role-row">
                <mat-checkbox>Checkbox</mat-checkbox>
                <mat-chip-set class="role-chips ui-chips">
                  <mat-chip removable="true">Chip <mat-icon matChipRemove>cancel</mat-icon></mat-chip>
                </mat-chip-set>
              </div>

              <div class="app-col-12 form-actions ui-actions ui-action-cell">
                <button mat-flat-button class="ui-action-btn" color="primary" type="button">
                  <mat-icon>edit</mat-icon>
                </button>
              </div>
            </section>

            <mat-divider></mat-divider>

            <mat-progress-bar mode="determinate" [value]="45"></mat-progress-bar>

            <mat-accordion>
              <mat-expansion-panel class="form-section">
                <mat-expansion-panel-header>
                  <mat-panel-title class="form-section-title">Expansion Panel</mat-panel-title>
                  <mat-panel-description class="form-section-subtitle">Beschreibung</mat-panel-description>
                </mat-expansion-panel-header>
                <div class="form-section-body">Panel Inhalt</div>
              </mat-expansion-panel>
            </mat-accordion>

            <mat-tab-group>
              <mat-tab label="Liste">
                <mat-list>
                  <mat-list-item>Eintrag 1</mat-list-item>
                  <mat-list-item>Eintrag 2</mat-list-item>
                </mat-list>
              </mat-tab>
              <mat-tab label="Tabelle">
                <div class="table-wrap ui-table-wrap">
                  <table mat-table [dataSource]="dataSource">
                    <ng-container matColumnDef="name">
                      <th mat-header-cell *matHeaderCellDef>Name</th>
                      <td mat-cell *matCellDef="let row">{{ row.name }}</td>
                    </ng-container>
                    <ng-container matColumnDef="action">
                      <th mat-header-cell *matHeaderCellDef>Aktion</th>
                      <td mat-cell *matCellDef="let row" class="ui-action-cell">
                        <button mat-flat-button class="ui-action-btn" color="primary" type="button">
                          <mat-icon>remove_red_eye</mat-icon>
                        </button>
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
                  </table>
                  <mat-paginator [length]="20" [pageSize]="10"></mat-paginator>
                </div>
              </mat-tab>
            </mat-tab-group>

            <mat-stepper>
              <mat-step label="Schritt 1">Inhalt Schritt 1</mat-step>
              <mat-step label="Schritt 2">Inhalt Schritt 2</mat-step>
            </mat-stepper>

            <mat-error>Beispiel-Fehlermeldung</mat-error>
          </mat-card-content>
        </mat-card>
      </section>
    `,
  }),
};
