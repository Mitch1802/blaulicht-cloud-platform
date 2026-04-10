import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatSelectModule } from '@angular/material/select';
import {
  ImrBreadcrumbItem,
  ImrCardComponent,
  ImrHeaderComponent,
  ImrPageLayoutComponent,
} from '../imr-ui-library';
import { ApiHttpService } from '../_service/api-http.service';
import { AuthSessionService } from '../_service/auth-session.service';
import { CollectionUtilsService } from '../_service/collection-utils.service';
import { NavigationService } from '../_service/navigation.service';
import { UiMessageService } from '../_service/ui-message.service';
import { IAnwesenheitsliste } from '../_interface/anwesenheitsliste';
import { IMitglied } from '../_interface/mitglied';
import { DateInputMaskDirective } from '../_directive/date-input-mask.directive';

@Component({
  selector: 'app-anwesenheitsliste',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ImrCardComponent,
    ImrHeaderComponent,
    ImrPageLayoutComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
    MatSelectModule,
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
  breadcrumb: ImrBreadcrumbItem[] = [];
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
      error: (error: unknown) => this.authSessionService.errorAnzeigen(error),
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
      main: this.apiHttpService.get<IAnwesenheitsliste[]>(this.modul),
      context: this.apiHttpService.get<{ mitglieder?: IMitglied[] }>(`${this.modul}/context`),
    }).subscribe({
      next: ({ main, context }) => {
        try {
          this.mitglieder = context.mitglieder ?? [];
          this.mitglieder = this.collectionUtilsService.arraySortByKey(this.mitglieder, 'stbnr');
          this.mitgliederMap = new Map<number, IMitglied>(this.mitglieder.map((m) => [m.pkid, m]));

          this.eintraege = main.map((item) => this.mapEintragMitMitgliedern(item));
          this.sortEintraege();
          this.bindTableControls();
        } catch (e: unknown) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: unknown) => {
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

  get selectedMitgliedOptionen(): IMitglied[] {
    const selectedIds = this.formModul.controls['mitglied_ids'].value;
    const idToMitglied = new Map(this.dropdownMitglieder.map((mitglied) => [mitglied.pkid, mitglied]));
    return selectedIds.map((id) => idToMitglied.get(id)).filter((mitglied): mitglied is IMitglied => Boolean(mitglied));
  }

  get mitgliederAuswahlCounter(): number {
    return this.formModul.controls['mitglied_ids'].value.length;
  }

  get mitgliederAuswahlTriggerText(): string {
    const first = this.selectedMitgliedOptionen[0];
    if (!first) {
      return 'Keine Mitglieder ausgewählt';
    }
    return `${first.stbnr} - ${first.vorname} ${first.nachname}`;
  }

  get sortedMitgliedOptionen(): IMitglied[] {
    const selectedIds = this.formModul.controls['mitglied_ids'].value;
    const idToMitglied = new Map(this.dropdownMitglieder.map((mitglied) => [mitglied.pkid, mitglied]));

    const selectedMembers = selectedIds
      .map((id) => idToMitglied.get(id))
      .filter((mitglied): mitglied is IMitglied => mitglied !== undefined);

    const selectedSet = new Set(selectedIds);
    const unselectedMembers = this.dropdownMitglieder.filter((mitglied) => !selectedSet.has(mitglied.pkid));

    return [...selectedMembers, ...unselectedMembers];
  }

  neueDetails(): void {
    this.formModul.enable();
    this.formModul.patchValue({ id: '', mitglied_ids: [], titel: '', datum: '', ort: '', notiz: '' });
    this.bestehendeFotos = [];
    this.resetFotoUploads();
  }

  auswahlBearbeiten(element: IAnwesenheitsliste): void {
    if (!element.id) {
      return;
    }

    const abfrageUrl = `${this.modul}/${element.id}`;
    this.apiHttpService.get<IAnwesenheitsliste>(abfrageUrl).subscribe({
      next: (erg) => {
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
        } catch (e: unknown) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: unknown) => this.authSessionService.errorAnzeigen(error)
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
      this.apiHttpService.post<IAnwesenheitsliste>(this.modul, payload, true).subscribe({
        next: (erg) => {
          try {
            const neu = this.mapEintragMitMitgliedern(erg);
            this.eintraege.push(neu);
            this.sortEintraege();
            this.resetFormNachAktion();
            this.uiMessageService.erstelleMessage('success', 'Eintrag erfolgreich gespeichert!');
          } catch (e: unknown) {
            this.uiMessageService.erstelleMessage('error', String(e));
          }
        },
        error: (error: unknown) => this.authSessionService.errorAnzeigen(error)
      });
    } else {
      this.apiHttpService.patch<IAnwesenheitsliste>(this.modul, idValue, payload, true).subscribe({
        next: (erg) => {
          try {
            const geaendert = this.mapEintragMitMitgliedern(erg);
            this.eintraege = this.eintraege.map(item => item.id === geaendert.id ? geaendert : item);
            this.sortEintraege();
            this.resetFormNachAktion();
            this.uiMessageService.erstelleMessage('success', 'Eintrag erfolgreich gespeichert!');
          } catch (e: unknown) {
            this.uiMessageService.erstelleMessage('error', String(e));
          }
        },
        error: (error: unknown) => this.authSessionService.errorAnzeigen(error)
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
      error: (error: unknown) => this.authSessionService.errorAnzeigen(error)
    });
  }

  abbrechen(): void {
    this.resetFormNachAktion();
    this.uiMessageService.erstelleMessage('info', 'Änderungen verworfen.');
  }

  private resetFormNachAktion(): void {
    this.formModul.disable();
    this.formModul.reset({ id: '', mitglied_ids: [], titel: '', datum: '', ort: '', notiz: '' });
    this.bestehendeFotos = [];
    this.resetFotoUploads();
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

