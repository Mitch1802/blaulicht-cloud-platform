import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatButton } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatOption } from '@angular/material/core';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
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
    MatOption,
    MatAutocompleteModule,
    MatChipsModule,
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
  private mitgliederMap = new Map<number, IMitglied>();
  mitgliedSuche = new FormControl<string>('', { nonNullable: true });
  breadcrumb: any = [];
  dataSource = new MatTableDataSource<IAnwesenheitsliste>(this.eintraege);
  sichtbareSpalten: string[] = ['mitglieder', 'datum', 'titel', 'ort', 'actions'];

  private buildMitgliederAnzeige(mitgliedIds: number[] = []): string {
    return mitgliedIds
      .map((mitgliedId) => this.mitgliederMap.get(mitgliedId))
      .filter((mitglied): mitglied is IMitglied => Boolean(mitglied))
      .map((mitglied) => `${mitglied.stbnr} - ${mitglied.vorname} ${mitglied.nachname}`)
      .join(', ');
  }

  private mapEintragMitMitgliedern(item: IAnwesenheitsliste): IAnwesenheitsliste {
    return {
      ...item,
      mitglieder_anzeige: this.buildMitgliederAnzeige(item.mitglied_ids || []),
    };
  }

  private sortEintraege(): void {
    this.eintraege = [...this.eintraege].sort((a, b) => {
      const mitgliederA = String(a.mitglieder_anzeige ?? '');
      const mitgliederB = String(b.mitglieder_anzeige ?? '');
      const mitgliederVergleich = mitgliederA.localeCompare(mitgliederB, 'de');
      if (mitgliederVergleich === 0) {
        return String(a.titel ?? '').localeCompare(String(b.titel ?? ''), 'de');
      }
      return mitgliederVergleich;
    });
    this.dataSource.data = this.eintraege;
  }

  formModul = new FormGroup({
    id: new FormControl<string | ''>(''),
    mitglied_ids: new FormControl<number[]>([], { nonNullable: true, validators: [Validators.required] }),
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
          this.mitgliederMap = new Map<number, IMitglied>(this.mitglieder.map((m) => [m.pkid, m]));

          this.eintraege = (main as IAnwesenheitsliste[]).map((item) => this.mapEintragMitMitgliedern(item));
          this.sortEintraege();
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

  get filteredMitgliedOptionen(): IMitglied[] {
    const selectedIds = this.formModul.controls['mitglied_ids'].value;
    const search = this.mitgliedSuche.value.trim().toLowerCase();

    return this.dropdownMitglieder
      .filter((mitglied) => !selectedIds.includes(mitglied.pkid))
      .filter((mitglied) => {
        if (!search) {
          return true;
        }
        const label = `${mitglied.stbnr ?? ''} ${mitglied.vorname ?? ''} ${mitglied.nachname ?? ''}`.toLowerCase();
        return label.includes(search);
      });
  }

  get selectedMitgliedOptionen(): IMitglied[] {
    const selectedIds = this.formModul.controls['mitglied_ids'].value;
    return selectedIds
      .map((id) => this.mitglieder.find((mitglied) => mitglied.pkid === id))
      .filter((mitglied): mitglied is IMitglied => Boolean(mitglied));
  }

  onMitgliedSelected(event: MatAutocompleteSelectedEvent): void {
    const id = Number(event.option.value);
    const current = this.formModul.controls['mitglied_ids'].value;
    if (!current.includes(id)) {
      this.formModul.controls['mitglied_ids'].setValue([...current, id]);
    }
    this.mitgliedSuche.setValue('');
  }

  removeMitglied(id: number): void {
    const next = this.formModul.controls['mitglied_ids'].value.filter((x) => x !== id);
    this.formModul.controls['mitglied_ids'].setValue(next);
  }

  neueDetails(): void {
    this.formModul.enable();
    this.formModul.patchValue({ id: '', mitglied_ids: [], titel: '', datum: '', ort: '', notiz: '' });
    this.mitgliedSuche.setValue('');
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
            mitglied_ids: details.mitglied_ids || [],
            titel: details.titel || '',
            datum: details.datum || '',
            ort: details.ort || '',
            notiz: details.notiz || ''
          });
          this.mitgliedSuche.setValue('');
        } catch (e: any) {
          this.globalDataService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => this.globalDataService.errorAnzeigen(error)
    });
  }

  datenSpeichern(): void {
    const selectedMitgliedIds = this.formModul.controls['mitglied_ids'].value;

    if (this.formModul.invalid || selectedMitgliedIds.length === 0) {
      this.globalDataService.erstelleMessage('error', 'Bitte alle Pflichtfelder korrekt ausfüllen!');
      return;
    }

    const { id, mitglied_ids, ...rest } = this.formModul.getRawValue();
    const idValue = this.formModul.controls['id'].value || '';
    const payload = {
      ...rest,
      mitglied_ids: selectedMitgliedIds,
    };

    if (idValue === '') {
      this.globalDataService.post(this.modul, payload, false).subscribe({
        next: (erg: any) => {
          try {
            const neu = this.mapEintragMitMitgliedern(erg as IAnwesenheitsliste);
            this.eintraege.push(neu);
            this.sortEintraege();
            this.resetFormNachAktion();
            this.globalDataService.erstelleMessage('success', 'Eintrag erfolgreich gespeichert!');
          } catch (e: any) {
            this.globalDataService.erstelleMessage('error', e);
          }
        },
        error: (error: any) => this.globalDataService.errorAnzeigen(error)
      });
    } else {
      this.globalDataService.patch(this.modul, idValue, payload, false).subscribe({
        next: (erg: any) => {
          try {
            const geaendert = this.mapEintragMitMitgliedern(erg as IAnwesenheitsliste);
            this.eintraege = this.eintraege.map(item => item.id === geaendert.id ? geaendert : item);
            this.sortEintraege();
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
        this.sortEintraege();
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
    this.formModul.reset({ id: '', mitglied_ids: [], titel: '', datum: '', ort: '', notiz: '' });
    this.mitgliedSuche.setValue('');
  }
}
