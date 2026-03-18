import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
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

import { ImrHeaderComponent } from '../imr-ui-library';
import { ApiHttpService } from '../_service/api-http.service';
import { AuthSessionService } from '../_service/auth-session.service';
import { CollectionUtilsService } from '../_service/collection-utils.service';
import { NavigationService } from '../_service/navigation.service';
import { UiMessageService } from '../_service/ui-message.service';
import { IAnwesenheitsliste } from '../_interface/anwesenheitsliste';
import { IMitglied } from '../_interface/mitglied';
import { ImrPageLayoutComponent, ImrSectionCardComponent } from '../imr-ui-library';
import { DateInputMaskDirective } from '../_directive/date-input-mask.directive';

@Component({
  selector: 'app-anwesenheitsliste',
  imports: [
    ImrHeaderComponent,
    ImrPageLayoutComponent,
    ImrSectionCardComponent,
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
    MatIcon,
    DateInputMaskDirective,
  ],
  templateUrl: './anwesenheitsliste.component.html',
  styleUrl: './anwesenheitsliste.component.sass',
})
export class AnwesenheitslisteComponent implements OnInit {
  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  router = inject(Router);

  title = 'Anwesenheitsliste';
  modul = 'anwesenheitsliste';

  eintraege: IAnwesenheitsliste[] = [];
  mitglieder: IMitglied[] = [];
  private mitgliederMap = new Map<number, IMitglied>();
  mitgliedSuche = new FormControl<string>('', { nonNullable: true });
  breadcrumb: any = [];
  dataSource = new MatTableDataSource<IAnwesenheitsliste>(this.eintraege);
  sichtbareSpalten: string[] = ['datum', 'titel', 'ort', 'mitglieder', 'actions'];

  get eintragCount(): number {
    return this.eintraege.length;
  }

  get filteredEintragCount(): number {
    return this.dataSource.filteredData.length;
  }

  private normalizeFilterValue(value: string): string {
    return String(value || '').trim().toLowerCase();
  }

  private getEintragFilterText(eintrag: IAnwesenheitsliste): string {
    return `${eintrag.datum} ${eintrag.titel} ${eintrag.ort} ${eintrag.mitglieder_anzeige || ''}`.toLowerCase();
  }
  bestehendeFotos: IAnwesenheitsliste['fotos'] = [];
  fotoDokuDateien: string[] = [];
  fotoDokuFiles: File[] = [];

  private filePreviewUrlMap = new Map<File, string>();

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
      mitglieder_anzahl: (item.mitglied_ids || []).length,
      mitglieder_anzeige: this.buildMitgliederAnzeige(item.mitglied_ids || []),
    };
  }

  isImagePath(path: string | undefined): boolean {
    if (!path) {
      return false;
    }
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(path);
  }

  getFileNameFromPath(path: string | undefined): string {
    if (!path) {
      return 'Datei';
    }
    const clean = path.split('?')[0];
    return clean.split('/').pop() || clean;
  }

  getFilePreviewUrl(file: File): string {
    const existing = this.filePreviewUrlMap.get(file);
    if (existing) {
      return existing;
    }
    const created = URL.createObjectURL(file);
    this.filePreviewUrlMap.set(file, created);
    return created;
  }

  openFoto(url: string | undefined): void {
    if (!url) {
      return;
    }
    window.open(url, '_blank');
  }

  onFotoDokuSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];

    this.fotoDokuFiles.forEach((file) => {
      const previewUrl = this.filePreviewUrlMap.get(file);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        this.filePreviewUrlMap.delete(file);
      }
    });

    this.fotoDokuFiles = files;
    this.fotoDokuDateien = files.map((file) => file.name);
  }

  removeSelectedFoto(index: number): void {
    const confirmDelete = window.confirm('Datei wirklich entfernen?');
    if (!confirmDelete) {
      return;
    }

    const removed = this.fotoDokuFiles[index];
    if (removed) {
      const previewUrl = this.filePreviewUrlMap.get(removed);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        this.filePreviewUrlMap.delete(removed);
      }
    }

    this.fotoDokuFiles = this.fotoDokuFiles.filter((_, i) => i !== index);
    this.fotoDokuDateien = this.fotoDokuFiles.map((file) => file.name);
  }

  loescheBestehendesFoto(foto: NonNullable<IAnwesenheitsliste['fotos']>[number]): void {
    const eintragId = this.formModul.controls['id'].value || '';
    if (!eintragId || !foto?.id) {
      return;
    }

    const fileName = this.getFileNameFromPath(foto.foto_url);
    const confirmDelete = window.confirm(`Foto "${fileName}" wirklich löschen?`);
    if (!confirmDelete) {
      return;
    }

    this.apiHttpService.delete(`${this.modul}/${eintragId}/fotos`, foto.id).subscribe({
      next: () => {
        this.bestehendeFotos = (this.bestehendeFotos || []).filter((entry) => String(entry.id) !== String(foto.id));
        this.uiMessageService.erstelleMessage('success', 'Foto gelöscht.');
      },
      error: (error: any) => this.authSessionService.errorAnzeigen(error),
    });
  }

  private sortEintraege(): void {
    this.eintraege = [...this.eintraege].sort((a, b) => {
      const anzahlA = Number(a.mitglieder_anzahl ?? 0);
      const anzahlB = Number(b.mitglieder_anzahl ?? 0);
      const anzahlVergleich = anzahlA - anzahlB;
      if (anzahlVergleich === 0) {
        return String(a.titel ?? '').localeCompare(String(b.titel ?? ''), 'de');
      }
      return anzahlVergleich;
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
    this.breadcrumb = this.navigationService.ladeBreadcrumb();

    this.formModul.disable();
    this.dataSource.filterPredicate = (data: IAnwesenheitsliste, filter: string) => {
      if (!filter) {
        return true;
      }
      return this.getEintragFilterText(data).includes(filter);
    };

    forkJoin({
      main: this.apiHttpService.get<any[]>(this.modul),
      context: this.apiHttpService.get<any>(`${this.modul}/context`),
    }).subscribe({
      next: ({ main, context }) => {
        try {
          this.mitglieder = (context.mitglieder as IMitglied[]) ?? [];
          this.mitglieder = this.collectionUtilsService.arraySortByKey(this.mitglieder, 'stbnr');
          this.mitgliederMap = new Map<number, IMitglied>(this.mitglieder.map((m) => [m.pkid, m]));

          this.eintraege = (main as IAnwesenheitsliste[]).map((item) => this.mapEintragMitMitgliedern(item));
          this.sortEintraege();
          this.bindTableControls();
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  private bindTableControls(): void {
    if (this.sort) this.dataSource.sort = this.sort;
    if (this.paginator) this.dataSource.paginator = this.paginator;
  }

  applyFilter(value: string): void {
    this.dataSource.filter = this.normalizeFilterValue(value);
    this.paginator?.firstPage();
  }

  get dropdownMitglieder(): IMitglied[] {
    return this.collectionUtilsService.arraySortByKey(this.mitglieder, 'stbnr');
  }

  get filteredMitgliedOptionen(): IMitglied[] {
    const selectedIds = this.formModul.controls['mitglied_ids'].value;
    const search = this.mitgliedSuche.value.trim().toLowerCase();
    const idToMitglied = new Map(this.dropdownMitglieder.map((m) => [m.pkid, m]));

    // Ausgewählte Mitglieder in der Reihenfolge des selectedIds arrays
    const selectedMembers = selectedIds
      .map((id) => idToMitglied.get(id))
      .filter((m): m is IMitglied => m !== undefined)
      .filter((mitglied) => {
        if (!search) {
          return true;
        }
        const label = `${mitglied.stbnr ?? ''} ${mitglied.vorname ?? ''} ${mitglied.nachname ?? ''}`.toLowerCase();
        return label.includes(search);
      });

    // Nicht ausgewählte Mitglieder
    const selectedSet = new Set(selectedIds);
    const unselectedMembers = this.dropdownMitglieder
      .filter((mitglied) => !selectedSet.has(mitglied.pkid))
      .filter((mitglied) => {
        if (!search) {
          return true;
        }
        const label = `${mitglied.stbnr ?? ''} ${mitglied.vorname ?? ''} ${mitglied.nachname ?? ''}`.toLowerCase();
        return label.includes(search);
      });

    return [...selectedMembers, ...unselectedMembers];
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
    this.bestehendeFotos = [];
    this.resetFotoUploads();
  }

  auswahlBearbeiten(element: IAnwesenheitsliste): void {
    if (!element.id) {
      return;
    }

    const abfrageUrl = `${this.modul}/${element.id}`;
    this.apiHttpService.get(abfrageUrl).subscribe({
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
          this.bestehendeFotos = details.fotos || [];
          this.resetFotoUploads();
          this.mitgliedSuche.setValue('');
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: any) => this.authSessionService.errorAnzeigen(error)
    });
  }

  datenSpeichern(): void {
    const selectedMitgliedIds = this.formModul.controls['mitglied_ids'].value;

    if (this.formModul.invalid || selectedMitgliedIds.length === 0) {
      this.uiMessageService.erstelleMessage('error', 'Bitte alle Pflichtfelder korrekt ausfüllen!');
      return;
    }

    const idValue = this.formModul.controls['id'].value || '';
    const payload = this.buildFormDataPayload(selectedMitgliedIds);

    if (idValue === '') {
      this.apiHttpService.post(this.modul, payload, true).subscribe({
        next: (erg: any) => {
          try {
            const neu = this.mapEintragMitMitgliedern(erg as IAnwesenheitsliste);
            this.eintraege.push(neu);
            this.sortEintraege();
            this.resetFormNachAktion();
            this.uiMessageService.erstelleMessage('success', 'Eintrag erfolgreich gespeichert!');
          } catch (e: any) {
            this.uiMessageService.erstelleMessage('error', String(e));
          }
        },
        error: (error: any) => this.authSessionService.errorAnzeigen(error)
      });
    } else {
      this.apiHttpService.patch(this.modul, idValue, payload, true).subscribe({
        next: (erg: any) => {
          try {
            const geaendert = this.mapEintragMitMitgliedern(erg as IAnwesenheitsliste);
            this.eintraege = this.eintraege.map(item => item.id === geaendert.id ? geaendert : item);
            this.sortEintraege();
            this.resetFormNachAktion();
            this.uiMessageService.erstelleMessage('success', 'Eintrag erfolgreich gespeichert!');
          } catch (e: any) {
            this.uiMessageService.erstelleMessage('error', String(e));
          }
        },
        error: (error: any) => this.authSessionService.errorAnzeigen(error)
      });
    }
  }

  datenLoeschen(): void {
    const idValue = this.formModul.controls['id'].value || '';
    if (!idValue) return;

    this.apiHttpService.delete(this.modul, idValue).subscribe({
      next: () => {
        this.eintraege = this.eintraege.filter(item => item.id !== idValue);
        this.sortEintraege();
        this.resetFormNachAktion();
        this.uiMessageService.erstelleMessage('success', 'Eintrag erfolgreich gelöscht!');
      },
      error: (error: any) => this.authSessionService.errorAnzeigen(error)
    });
  }

  abbrechen(): void {
    this.uiMessageService.erstelleMessage('info', 'Änderungen verworfen.');
    this.router.navigate(['/anwesenheitsliste']);
  }

  private resetFormNachAktion(): void {
    this.formModul.disable();
    this.formModul.reset({ id: '', mitglied_ids: [], titel: '', datum: '', ort: '', notiz: '' });
    this.bestehendeFotos = [];
    this.resetFotoUploads();
    this.mitgliedSuche.setValue('');
  }

  private buildFormDataPayload(selectedMitgliedIds: number[]): FormData {
    const fd = new FormData();
    const values = this.formModul.getRawValue();

    fd.append('titel', values.titel || '');
    fd.append('datum', values.datum || '');
    fd.append('ort', values.ort || '');
    fd.append('notiz', values.notiz || '');

    selectedMitgliedIds.forEach((mitgliedId) => fd.append('mitglied_ids', String(mitgliedId)));
    this.fotoDokuFiles.forEach((file) => fd.append('fotos_doku', file));

    return fd;
  }

  private resetFotoUploads(): void {
    this.filePreviewUrlMap.forEach((url) => URL.revokeObjectURL(url));
    this.filePreviewUrlMap.clear();

    this.fotoDokuDateien = [];
    this.fotoDokuFiles = [];
  }
}
