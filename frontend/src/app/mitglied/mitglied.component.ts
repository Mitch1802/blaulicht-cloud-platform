import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';

import { FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule, ValidatorFn, AbstractControl } from '@angular/forms';
import { IMitglied } from 'src/app/_interface/mitglied';
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
import { ImrHeaderComponent } from '../imr-ui-library';
import { MatCardModule } from '@angular/material/card';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatOption, MatSelect } from '@angular/material/select';
import { Router } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import * as Papa from 'papaparse';
import { MatSort } from '@angular/material/sort';
import { DateInputMaskDirective } from '../_directive/date-input-mask.directive';

type RenameMap = {
  [originalKey: string]: string;
};

type ImportChange = {
  action: 'CREATE' | 'UPDATE';
  row: number;
  stbnr: number;
  geburtsdatum: string;
  name: string;
  changed_fields: string[];
};

type ImportSummary = {
  created: number;
  updated: number;
  unchanged: number;
  total_changes: number;
  total_rows: number;
};

@Component({
    selector: 'app-mitglied',
    imports: [
    ImrHeaderComponent,
    MatCardModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatButton,
    MatInput,
    MatError,
    MatCheckbox,
    MatSelect,
    MatOption,
    MatTableModule,
    MatPaginatorModule,
    MatSort,
    MatIconModule,
    DateInputMaskDirective,
],
    templateUrl: './mitglied.component.html',
    styleUrl: './mitglied.component.sass'
})

export class MitgliedComponent implements OnInit {
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  router = inject(Router);

  dataSource = new MatTableDataSource<IMitglied>([]);

  @ViewChild(MatPaginator) set matPaginator(p: MatPaginator | undefined) {
    if (p) this.dataSource.paginator = p;
  }

  @ViewChild(MatSort) set matSort(s: MatSort | undefined) {
    if (s) this.dataSource.sort = s;
  }

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  title = "Mitglieder Verwaltung";
  modul = "mitglieder";

  mitglieder: IMitglied[] = [];
  breadcrumb: any = [];
  importRows: any[] = [];
  importChanges: ImportChange[] = [];
  importSummary: ImportSummary | null = null;

  formAuswahl = new FormGroup({
    mitglied: new FormControl(0)
  });

  formModul = new FormGroup({
    id: new FormControl(''),
    stbnr: new FormControl(0, Validators.required),
    vorname: new FormControl('', Validators.required),
    nachname: new FormControl('', Validators.required),
    dienstgrad: new FormControl(''),
    svnr: new FormControl('', [
      Validators.minLength(4),
      Validators.maxLength(4),
      Validators.pattern(/^\d{4}$/)
    ]),
    geburtsdatum: new FormControl('', [
      Validators.required,
      Validators.pattern(/^([0-3]\d)\.([0-1]\d)\.(\d{4})$/),
      this.validDateDDMMYYYY()
    ]),
    hauptberuflich: new FormControl(false),
    dienststatus: new FormControl<'JUGEND' | 'AKTIV' | 'RESERVE' | 'ABGEMELDET'>('AKTIV', Validators.required)
  });

  sichtbareSpaltenMitglieder: string[] = ['stbnr', 'vorname', 'nachname', 'dienstgrad', 'dienststatus', 'actions'];

  private normalizeFilterValue(value: string): string {
    return String(value || '').trim().toLowerCase();
  }

  private getMitgliedFilterText(mitglied: IMitglied): string {
    return `${mitglied.stbnr} ${mitglied.vorname} ${mitglied.nachname} ${mitglied.dienstgrad || ''} ${mitglied.dienststatus || ''}`.toLowerCase();
  }

  ngOnInit(): void {
    sessionStorage.setItem("PageNumber", "2");
    sessionStorage.setItem("Page2", "V_M");
    this.breadcrumb = this.navigationService.ladeBreadcrumb();
    this.formModul.disable();
    this.dataSource.filterPredicate = (data: IMitglied, filter: string) => {
      if (!filter) {
        return true;
      }
      return this.getMitgliedFilterText(data).includes(filter);
    };

    this.apiHttpService.get(this.modul).subscribe({
      next: (erg: any) => {
        try {
          this.mitglieder = this.collectionUtilsService.arraySortByKey(erg, 'stbnr');
          this.dataSource.data = this.mitglieder;
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }
    const file = input.files[0];

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ';',
      complete: (results: any) => {
        const parsed: any[] = results.data;

        if (parsed.length > 0) {
          this.previewImport(parsed);
        } else {
          this.uiMessageService.erstelleMessage('info', 'Keine CSV-Daten gefunden.');
        }

        input.value = '';
      },
      error: () => this.uiMessageService.erstelleMessage('error', 'CSV Parsing Fehler.')
    });
  }

  transformArray<T extends Record<string, any>>(
    inputArray: T[],
    keysToPickAndRename: RenameMap
  ): Record<string, any>[] {
    return inputArray.map(obj => {
      const transformed: Record<string, any> = {};
      for (const [oldKey, newKey] of Object.entries(keysToPickAndRename)) {
        if (oldKey in obj) {
          transformed[newKey] = obj[oldKey];
        }
      }
      return transformed;
    });
  }

  applyFilter(value: string): void {
    this.dataSource.filter = this.normalizeFilterValue(value);
    this.dataSource.paginator?.firstPage();
  }

  previewImport(entries: any[]): void {
    this.importRows = entries;
    const url = `${this.modul}/import`;
    this.apiHttpService.post(url, { mode: 'preview', rows: entries }, false).subscribe({
      next: (erg: any) => {
        this.importChanges = erg?.changes ?? [];
        this.importSummary = erg?.summary ?? null;
        this.uiMessageService.erstelleMessage('info', `${this.importChanges.length} Änderungen in der Vorschau gefunden.`);
      },
      error: (error: any) => this.authSessionService.errorAnzeigen(error)
    });
  }

  importBestaetigen(): void {
    if (this.importRows.length === 0) {
      this.uiMessageService.erstelleMessage('info', 'Keine Importdaten vorhanden.');
      return;
    }

    const url = `${this.modul}/import`;
    this.apiHttpService.post(url, { mode: 'apply', rows: this.importRows }, false).subscribe({
      next: (erg: any) => {
        const summary = erg?.summary ?? { created: 0, updated: 0 };
        this.uiMessageService.erstelleMessage('success', `${summary.created} neu, ${summary.updated} aktualisiert.`);
        this.importAbbrechen();

        this.apiHttpService.get(this.modul).subscribe({
          next: (list: any) => {
            this.mitglieder = this.collectionUtilsService.arraySortByKey(list, 'stbnr');
            this.dataSource.data = this.mitglieder;
          },
          error: (error: any) => this.authSessionService.errorAnzeigen(error)
        });
      },
      error: (error: any) => this.authSessionService.errorAnzeigen(error)
    });
  }

  importAbbrechen(): void {
    this.importRows = [];
    this.importChanges = [];
    this.importSummary = null;
  }

  validDateDDMMYYYY(): ValidatorFn {
    return (control: AbstractControl) => {
      const v: string = control.value;
      if (!v || !/^([0-3]\d)\.([0-1]\d)\.(\d{4})$/.test(v)) {
        return null;
      }
      const [t, m, j] = v.split('.').map(x => +x);
      const d = new Date(j, m - 1, t);
      return (d.getFullYear() === j && d.getMonth() === m - 1 && d.getDate() === t)
        ? null
        : { dateInvalid: true };
    };
  }

  auswahlBearbeiten(element: any): void {
    if (element.id === 0) {
      return;
    }
    const abfrageUrl = `${this.modul}/${element.id}`;

    this.apiHttpService.get(abfrageUrl).subscribe({
      next: (erg: any) => {
        try {
          const details: IMitglied = erg;

          this.formModul.enable();
          this.formModul.setValue({
            id: details.id,
            stbnr: details.stbnr,
            vorname: details.vorname,
            nachname: details.nachname,
            dienstgrad: details.dienstgrad ?? '',
            svnr: details.svnr ?? '',
            geburtsdatum: details.geburtsdatum ?? '',
            hauptberuflich: details.hauptberuflich ?? false,
            dienststatus: details.dienststatus ?? 'AKTIV'
          });
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  neueDetails(): void {
    this.formModul.enable();
  }

  datenLoeschen(): void {
    const id = this.formModul.controls['id'].value!;
    if (!id) {
      this.uiMessageService.erstelleMessage('error', 'Kein Mitglied ausgewählt zum Löschen!');
      return;
    }

    this.apiHttpService.delete(this.modul, id).subscribe({
      next: (erg: any) => {
        try {
          this.mitglieder = this.mitglieder.filter(m => m.id !== id);
          this.dataSource.data = this.mitglieder;

          this.formModul.reset({
            id: '',
            stbnr: 0,
            vorname: '',
            nachname: '',
            dienstgrad: '',
            svnr: '',
            geburtsdatum: '',
            hauptberuflich: false,
            dienststatus: 'AKTIV'
          });
          this.formModul.disable();

          this.uiMessageService.erstelleMessage('success', 'Mitglied erfolgreich gelöscht!');
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  abbrechen(): void {
    this.uiMessageService.erstelleMessage('info', 'Mitglied nicht gespeichert!');
    this.formModul.reset({
      id: '',
      stbnr: 0,
      vorname: '',
      nachname: '',
      dienstgrad: '',
      svnr: '',
      geburtsdatum: '',
      hauptberuflich: false,
      dienststatus: 'AKTIV'
    });
    this.formModul.disable();
  }

  datenSpeichern(): void {
    if (this.formModul.invalid) {
      this.uiMessageService.erstelleMessage('error', 'Bitte alle Pflichtfelder korrekt ausfüllen!');
      return;
    }

    const objekt: any = this.formModul.value;
    const idValue = this.formModul.controls['id'].value;

    if (!idValue) {
      this.apiHttpService.post(this.modul, objekt, false).subscribe({
        next: (erg: any) => {
          try {
            this.mitglieder.push(erg);
            this.mitglieder = this.collectionUtilsService.arraySortByKey(this.mitglieder, 'stbnr');
            this.dataSource.data = this.mitglieder;

            this.formModul.reset({
              id: '',
              stbnr: 0,
              vorname: '',
              nachname: '',
              dienstgrad: '',
              svnr: '',
              geburtsdatum: '',
              hauptberuflich: false,
              dienststatus: 'AKTIV'
            });
            this.formModul.disable();

            this.uiMessageService.erstelleMessage('success', 'Mitglied erfolgreich gespeichert!');
          } catch (e: any) {
            this.uiMessageService.erstelleMessage('error', String(e));
          }
        },
        error: (error: any) => this.authSessionService.errorAnzeigen(error)
      });
    } else {
      this.apiHttpService.patch(this.modul, idValue, objekt, false).subscribe({
        next: (erg: any) => {
          try {
            this.mitglieder = this.mitglieder.map(m =>
              m.id === erg.id ? erg : m
            );
            this.dataSource.data = this.mitglieder;

            this.formModul.reset({
              id: '',
              stbnr: 0,
              vorname: '',
              nachname: '',
              dienstgrad: '',
              svnr: '',
              geburtsdatum: '',
              hauptberuflich: false,
              dienststatus: 'AKTIV'
            });
            this.formModul.disable();

            this.uiMessageService.erstelleMessage('success', 'Mitglied erfolgreich geändert!');
          } catch (e: any) {
            this.uiMessageService.erstelleMessage('error', String(e));
          }
        },
        error: (error: any) => this.authSessionService.errorAnzeigen(error)
      });
    }
  }
}
