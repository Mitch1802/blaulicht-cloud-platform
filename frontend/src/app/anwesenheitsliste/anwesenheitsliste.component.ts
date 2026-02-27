import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatButton } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatIcon } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';

import { HeaderComponent } from '../_template/header/header.component';
import { GlobalDataService } from '../_service/global-data.service';
import { IAnwesenheitsliste } from '../_interface/anwesenheitsliste';
import { IMitglied } from '../_interface/mitglied';

@Component({
  selector: 'app-anwesenheitsliste',
  imports: [
    HeaderComponent,
    MatCardModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatButton,
    MatInputModule,
    MatSelect,
    MatOption,
    MatError,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatIcon
  ],
  templateUrl: './anwesenheitsliste.component.html',
  styleUrl: './anwesenheitsliste.component.sass'
})
export class AnwesenheitslisteComponent implements OnInit {
  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  globalDataService = inject(GlobalDataService);
  router = inject(Router);

  title = 'Anwesenheitsliste';
  modul = 'anwesenheitsliste';

  eintraege: IAnwesenheitsliste[] = [];
  mitglieder: IMitglied[] = [];
  breadcrumb: any = [];
  dataSource = new MatTableDataSource<IAnwesenheitsliste>(this.eintraege);
  sichtbareSpalten: string[] = ['stbnr', 'vorname', 'nachname', 'datum', 'titel', 'ort', 'actions'];

  private sortEintraegeByStbnr(): void {
    this.eintraege = [...this.eintraege].sort((a, b) => {
      const stbnrA = Number(a.stbnr ?? Number.MAX_SAFE_INTEGER);
      const stbnrB = Number(b.stbnr ?? Number.MAX_SAFE_INTEGER);
      if (stbnrA === stbnrB) {
        return String(a.titel ?? '').localeCompare(String(b.titel ?? ''), 'de');
      }
      return stbnrA - stbnrB;
    });
    this.dataSource.data = this.eintraege;
  }

  formModul = new FormGroup({
    id: new FormControl<string | ''>(''),
    mitglied_id: new FormControl<number>(0, { nonNullable: true, validators: [Validators.required] }),
    titel: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    datum: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.pattern(/^([0-3]\d)\.([0-1]\d)\.(\d{4})$/)]
    }),
    ort: new FormControl<string>(''),
    notiz: new FormControl<string>(''),
  });

  ngOnInit(): void {
    sessionStorage.setItem('PageNumber', '2');
    sessionStorage.setItem('Page2', 'ANW');
    this.breadcrumb = this.globalDataService.ladeBreadcrumb();

    this.formModul.disable();

    forkJoin({
      main: this.globalDataService.get<any[]>(this.modul),
      context: this.globalDataService.get<any>(`${this.modul}/context`),
    }).subscribe({
      next: ({ main, context }) => {
        try {
          this.mitglieder = (context.mitglieder as IMitglied[]) ?? [];
          this.mitglieder = this.globalDataService.arraySortByKey(this.mitglieder, 'stbnr');

          const mitgliederMap = new Map<number, IMitglied>(this.mitglieder.map((m) => [m.pkid, m]));
          this.eintraege = (main as IAnwesenheitsliste[]).map((item) => {
            const mitglied = item.mitglied_id ? mitgliederMap.get(item.mitglied_id) : undefined;
            return {
              ...item,
              stbnr: mitglied?.stbnr,
              vorname: mitglied?.vorname,
              nachname: mitglied?.nachname,
            };
          });
          this.sortEintraegeByStbnr();
          this.bindTableControls();
        } catch (e: any) {
          this.globalDataService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      }
    });
  }

  private bindTableControls(): void {
    if (this.sort) this.dataSource.sort = this.sort;
    if (this.paginator) this.dataSource.paginator = this.paginator;
  }

  applyFilter(value: string): void {
    this.dataSource.filter = (value || '').trim().toLowerCase();
    this.paginator?.firstPage();
  }

  get dropdownMitglieder(): IMitglied[] {
    return this.globalDataService.arraySortByKey(this.mitglieder, 'stbnr');
  }

  neueDetails(): void {
    this.formModul.enable();
    this.formModul.patchValue({ id: '', mitglied_id: 0, titel: '', datum: '', ort: '', notiz: '' });
  }

  auswahlBearbeiten(element: IAnwesenheitsliste): void {
    if (!element.id) {
      return;
    }

    const abfrageUrl = `${this.modul}/${element.id}`;
    this.globalDataService.get(abfrageUrl).subscribe({
      next: (erg: any) => {
        try {
          const details: IAnwesenheitsliste = erg;
          this.formModul.enable();
          this.formModul.setValue({
            id: details.id || '',
            mitglied_id: details.mitglied_id || 0,
            titel: details.titel || '',
            datum: details.datum || '',
            ort: details.ort || '',
            notiz: details.notiz || ''
          });
        } catch (e: any) {
          this.globalDataService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => this.globalDataService.errorAnzeigen(error)
    });
  }

  datenSpeichern(): void {
    if (this.formModul.invalid) {
      this.globalDataService.erstelleMessage('error', 'Bitte alle Pflichtfelder korrekt ausfüllen!');
      return;
    }

    const objekt: any = this.formModul.value;
    const idValue = this.formModul.controls['id'].value || '';

    if (idValue === '') {
      this.globalDataService.post(this.modul, objekt, false).subscribe({
        next: (erg: any) => {
          try {
            const neuRaw = erg as IAnwesenheitsliste;
            const mitglied = this.mitglieder.find((m) => m.pkid === neuRaw.mitglied_id);
            const neu: IAnwesenheitsliste = {
              ...neuRaw,
              stbnr: mitglied?.stbnr,
              vorname: mitglied?.vorname,
              nachname: mitglied?.nachname,
            };
            this.eintraege.push(neu);
            this.sortEintraegeByStbnr();
            this.resetFormNachAktion();
            this.globalDataService.erstelleMessage('success', 'Eintrag erfolgreich gespeichert!');
          } catch (e: any) {
            this.globalDataService.erstelleMessage('error', e);
          }
        },
        error: (error: any) => this.globalDataService.errorAnzeigen(error)
      });
    } else {
      this.globalDataService.patch(this.modul, idValue, objekt, false).subscribe({
        next: (erg: any) => {
          try {
            const geaendertRaw = erg as IAnwesenheitsliste;
            const mitglied = this.mitglieder.find((m) => m.pkid === geaendertRaw.mitglied_id);
            const geaendert: IAnwesenheitsliste = {
              ...geaendertRaw,
              stbnr: mitglied?.stbnr,
              vorname: mitglied?.vorname,
              nachname: mitglied?.nachname,
            };
            this.eintraege = this.eintraege.map(item => item.id === geaendert.id ? geaendert : item);
            this.sortEintraegeByStbnr();
            this.resetFormNachAktion();
            this.globalDataService.erstelleMessage('success', 'Eintrag erfolgreich gespeichert!');
          } catch (e: any) {
            this.globalDataService.erstelleMessage('error', e);
          }
        },
        error: (error: any) => this.globalDataService.errorAnzeigen(error)
      });
    }
  }

  datenLoeschen(): void {
    const idValue = this.formModul.controls['id'].value || '';
    if (!idValue) return;

    this.globalDataService.delete(this.modul, idValue).subscribe({
      next: () => {
        this.eintraege = this.eintraege.filter(item => item.id !== idValue);
        this.sortEintraegeByStbnr();
        this.resetFormNachAktion();
        this.globalDataService.erstelleMessage('success', 'Eintrag erfolgreich gelöscht!');
      },
      error: (error: any) => this.globalDataService.errorAnzeigen(error)
    });
  }

  abbrechen(): void {
    this.globalDataService.erstelleMessage('info', 'Änderungen verworfen.');
    this.router.navigate(['/anwesenheitsliste']);
  }

  private resetFormNachAktion(): void {
    this.formModul.disable();
    this.formModul.reset({ id: '', mitglied_id: 0, titel: '', datum: '', ort: '', notiz: '' });
  }
}
