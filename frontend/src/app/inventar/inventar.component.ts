import { IInventar, IInventarVerleihung } from './../_interface/inventar';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  OnInit,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { GlobalDataService } from 'src/app/_service/global-data.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { NgStyle } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Router } from '@angular/router';
import { HeaderComponent } from '../_template/header/header.component';
import { FormatService } from '../helpers/format.service';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatIcon } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

interface IVerleihungFormEintrag {
  an: string;
  anzahl: number;
  bis: string;
}

@Component({
  selector: 'app-inventar',
  imports: [
    HeaderComponent,
    MatCardModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatButton,
    MatInputModule,
    MatError,
    NgStyle,
    MatAutocompleteModule,
    MatCheckboxModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatSelectModule,
    MatTooltipModule,
    MatIcon
  ],
  templateUrl: './inventar.component.html',
  styleUrl: './inventar.component.sass',
})
export class InventarComponent implements OnInit, AfterViewInit {
  @ViewChild('fotoUpload', { static: false }) fotoRef!: ElementRef<HTMLInputElement>;
  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  globalDataService = inject(GlobalDataService);
  formatService = inject(FormatService);
  router = inject(Router);
  destroyRef = inject(DestroyRef);

  title = 'Inventar verwalten';
  modul = 'inventar';

  inventarArray: IInventar[] = [];
  breadcrumb: any = [];
  dataSource = new MatTableDataSource<IInventar>(this.inventarArray);
  sichtbareSpalten: string[] = ['bezeichnung', 'anzahl', 'lagerort', 'leihstatus', 'actions'];

  btnText = 'Bild auswählen';
  fileName = '';
  filePfad = '';
  fileFound = false;
  btnUploadStatus = false;
  verleihungenForm: IVerleihungFormEintrag[] = [];
  ausborgenModalOffen = false;
  ausborgenArtikel: IInventar | null = null;
  rueckgabeModalOffen = false;
  rueckgabeArtikel: IInventar | null = null;
  rueckgabeVerleihungen: IInventarVerleihung[] = [];

  ausborgenForm = new FormGroup({
    an: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    anzahl: new FormControl<number>(1, { nonNullable: true }),
    bis: new FormControl<string>(''),
  });

  rueckgabeForm = new FormGroup({
    eintragIndex: new FormControl<number>(0, { nonNullable: true }),
    anzahl: new FormControl<number>(1, { nonNullable: true }),
  });

  formModul = new FormGroup({
    id: new FormControl<string | ''>(''),
    bezeichnung: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    anzahl: new FormControl<number>(0),
    lagerort: new FormControl<string>(''),
    ist_verliehen: new FormControl<boolean>(false, { nonNullable: true }),
    notiz: new FormControl<string>(''),
    // nur für Anzeige/Modal – NICHT ans Backend senden
    foto_url: new FormControl<string>(''),
  });

  ngAfterViewInit(): void {
    this.bindTableControls();
  }

  ngOnInit(): void {
    sessionStorage.setItem('PageNumber', '2');
    sessionStorage.setItem('Page2', 'INV');
    this.breadcrumb = this.globalDataService.ladeBreadcrumb();

    this.formModul.disable();
    this.observeLeihstatus();

    this.globalDataService.get(this.modul).subscribe({
      next: (erg: any) => {
        try {
          this.inventarArray = this.convertNewsDate(erg) as IInventar[];
          this.dataSource.data = this.inventarArray;
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

  /** Datei aus dem ViewChild-input holen */
  private getSelectedFile(): File | null {
    const el = this.fotoRef?.nativeElement;
    return el?.files && el.files.length ? el.files[0] : null;
  }

  /** Server-Datum ins gewünschte Anzeigeformat bringen */
  convertNewsDate(data: any): any[] {
    for (let i = 0; i < data.length; i++) {
      const created_at = String(data[i].created_at).split('T');
      const created_at_date = created_at[0];
      const created_at_time = created_at[1]?.split(':') ?? [];
      data[i].created_at = created_at_date + '_' + created_at_time[0] + ':' + created_at_time[1];

      const updated_at = String(data[i].updated_at).split('T');
      const updated_at_date = updated_at[0];
      const updated_at_time = updated_at[1]?.split(':') ?? [];
      data[i].updated_at = updated_at_date + '_' + updated_at_time[0] + ':' + updated_at_time[1];
    }
    return data;
  }

  isVerliehenAktiv(): boolean {
    return this.formModul.controls['ist_verliehen'].value === true;
  }

  addVerleihungZeile(): void {
    this.verleihungenForm.push(this.createLeihEintrag());
  }

  removeVerleihungZeile(index: number): void {
    if (index < 0 || index >= this.verleihungenForm.length) {
      return;
    }
    this.verleihungenForm.splice(index, 1);
  }

  getVerliehenGesamtImFormular(): number {
    return this.verleihungenForm.reduce((sum, eintrag) => {
      const value = Number(eintrag.anzahl ?? 0);
      return sum + (Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0);
    }, 0);
  }

  getVerfuegbarImFormular(): number {
    const gesamtAnzahl = Number(this.formModul.controls['anzahl'].value ?? 0);
    const rest = gesamtAnzahl - this.getVerliehenGesamtImFormular();
    return rest > 0 ? rest : 0;
  }

  getVerfuegbarFuerInventar(element: IInventar): number {
    const gesamtAnzahl = Number(element.anzahl ?? 0);
    const verliehen = this.getVerleihungenAusInventar(element).reduce((sum, eintrag) => sum + (eintrag.anzahl || 0), 0);
    const verfuegbar = gesamtAnzahl - verliehen;
    return verfuegbar > 0 ? verfuegbar : 0;
  }

  getAktiveVerleihungenAnzahl(element: IInventar): number {
    return this.getVerleihungenAusInventar(element).length;
  }

  getAusborgenVerfuegbar(): number {
    if (!this.ausborgenArtikel) {
      return 0;
    }
    return this.getVerfuegbarFuerInventar(this.ausborgenArtikel);
  }

  getAusborgenRestNachEingabe(): number {
    const verfuegbar = this.getAusborgenVerfuegbar();
    const angefragt = Number(this.ausborgenForm.controls['anzahl'].value ?? 0);
    if (!Number.isInteger(angefragt) || angefragt <= 0) {
      return verfuegbar;
    }
    const rest = verfuegbar - angefragt;
    return rest > 0 ? rest : 0;
  }

  openAusborgenModal(element: IInventar): void {
    const verfuegbar = this.getVerfuegbarFuerInventar(element);
    if (verfuegbar <= 0) {
      this.globalDataService.erstelleMessage('info', 'Keine verfuegbare Menge zum Ausborgen vorhanden.');
      return;
    }

    this.ausborgenArtikel = element;
    this.ausborgenForm.reset({ an: '', anzahl: 1, bis: '' });
    this.ausborgenModalOffen = true;
  }

  closeAusborgenModal(): void {
    this.ausborgenModalOffen = false;
    this.ausborgenArtikel = null;
    this.ausborgenForm.reset({ an: '', anzahl: 1, bis: '' });
  }

  openRueckgabeModal(element: IInventar): void {
    const verleihungen = this.getVerleihungenAusInventar(element);
    if (verleihungen.length === 0) {
      this.globalDataService.erstelleMessage('info', 'Keine aktive Verleihung fuer eine Rueckgabe vorhanden.');
      return;
    }

    this.rueckgabeArtikel = element;
    this.rueckgabeVerleihungen = verleihungen;
    this.rueckgabeForm.reset({ eintragIndex: 0, anzahl: 1 });
    this.rueckgabeModalOffen = true;
  }

  closeRueckgabeModal(): void {
    this.rueckgabeModalOffen = false;
    this.rueckgabeArtikel = null;
    this.rueckgabeVerleihungen = [];
    this.rueckgabeForm.reset({ eintragIndex: 0, anzahl: 1 });
  }

  onRueckgabeAuswahlChange(): void {
    const max = this.getRueckgabeMaxMenge();
    if (max <= 0) {
      this.rueckgabeForm.controls['anzahl'].setValue(1);
      return;
    }

    const current = Number(this.rueckgabeForm.controls['anzahl'].value ?? 0);
    if (!Number.isInteger(current) || current <= 0 || current > max) {
      this.rueckgabeForm.controls['anzahl'].setValue(1);
    }
  }

  getRueckgabeAuswahl(): IInventarVerleihung | null {
    const idx = Number(this.rueckgabeForm.controls['eintragIndex'].value ?? -1);
    if (!Number.isInteger(idx) || idx < 0 || idx >= this.rueckgabeVerleihungen.length) {
      return null;
    }
    return this.rueckgabeVerleihungen[idx];
  }

  getRueckgabeMaxMenge(): number {
    return this.getRueckgabeAuswahl()?.anzahl ?? 0;
  }

  getRueckgabeRestNachEingabe(): number {
    const max = this.getRueckgabeMaxMenge();
    const rueckgabeAnzahl = Number(this.rueckgabeForm.controls['anzahl'].value ?? 0);
    if (!Number.isInteger(rueckgabeAnzahl) || rueckgabeAnzahl <= 0) {
      return max;
    }
    const rest = max - rueckgabeAnzahl;
    return rest > 0 ? rest : 0;
  }

  rueckgabeSpeichern(): void {
    const artikel = this.rueckgabeArtikel;
    if (!artikel) {
      return;
    }

    const selection = this.getRueckgabeAuswahl();
    if (!selection) {
      this.globalDataService.erstelleMessage('error', 'Bitte eine Verleihung fuer die Rueckgabe auswaehlen.');
      return;
    }

    const rueckgabeAnzahl = Number(this.rueckgabeForm.controls['anzahl'].value ?? 0);
    if (!Number.isInteger(rueckgabeAnzahl) || rueckgabeAnzahl <= 0) {
      this.rueckgabeForm.controls['anzahl'].markAsTouched();
      this.globalDataService.erstelleMessage('error', 'Rueckgabe Anzahl muss eine ganze Zahl groesser 0 sein.');
      return;
    }

    if (rueckgabeAnzahl > selection.anzahl) {
      this.rueckgabeForm.controls['anzahl'].markAsTouched();
      this.globalDataService.erstelleMessage('error', 'Rueckgabe Anzahl ist groesser als die verliehene Menge.');
      return;
    }

    const selectedIndex = Number(this.rueckgabeForm.controls['eintragIndex'].value ?? -1);
    const neueVerleihungen = this.rueckgabeVerleihungen
      .map((eintrag, index) => {
        if (index !== selectedIndex) {
          return eintrag;
        }
        return {
          ...eintrag,
          anzahl: eintrag.anzahl - rueckgabeAnzahl,
        };
      })
      .filter((eintrag) => eintrag.anzahl > 0);

    this.globalDataService.patch(this.modul, artikel.id, { verleihungen: neueVerleihungen }, false).subscribe({
      next: (updateErg: any) => {
        try {
          const updated = updateErg as IInventar;
          this.inventarArray = this.inventarArray
            .map((m) => (m.id === updated.id ? updated : m))
            .sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung, 'de'));
          this.dataSource.data = this.inventarArray;
          this.bindTableControls();
          this.closeRueckgabeModal();
          this.globalDataService.erstelleMessage('success', 'Rueckgabe erfolgreich gespeichert.');
        } catch (e: any) {
          this.globalDataService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => this.globalDataService.errorAnzeigen(error),
    });
  }

  ausborgenSpeichern(): void {
    const artikel = this.ausborgenArtikel;
    if (!artikel) {
      return;
    }

    const an = (this.ausborgenForm.controls['an'].value ?? '').trim();
    const anzahl = Number(this.ausborgenForm.controls['anzahl'].value ?? 0);
    const bis = (this.ausborgenForm.controls['bis'].value ?? '').trim();

    if (!an) {
      this.ausborgenForm.controls['an'].markAsTouched();
      this.globalDataService.erstelleMessage('error', 'Bitte Empfaenger angeben.');
      return;
    }

    if (!Number.isInteger(anzahl) || anzahl <= 0) {
      this.ausborgenForm.controls['anzahl'].markAsTouched();
      this.globalDataService.erstelleMessage('error', 'Anzahl muss eine ganze Zahl groesser 0 sein.');
      return;
    }

    const verfuegbar = this.getVerfuegbarFuerInventar(artikel);
    if (anzahl > verfuegbar) {
      this.ausborgenForm.controls['anzahl'].markAsTouched();
      this.globalDataService.erstelleMessage('error', 'Angefragte Menge ist groesser als verfuegbar.');
      return;
    }

    this.globalDataService.get(`${this.modul}/${artikel.id}`).subscribe({
      next: (erg: any) => {
        try {
          const details = erg as IInventar;
          const aktuelleVerleihungen = this.getVerleihungenAusInventar(details);
          const payload = {
            verleihungen: [
              ...aktuelleVerleihungen,
              {
                an,
                anzahl,
                bis: bis || null,
              },
            ],
          };

          this.globalDataService.patch(this.modul, artikel.id, payload, false).subscribe({
            next: (updateErg: any) => {
              try {
                const updated = updateErg as IInventar;
                this.inventarArray = this.inventarArray
                  .map((m) => (m.id === updated.id ? updated : m))
                  .sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung, 'de'));
                this.dataSource.data = this.inventarArray;
                this.bindTableControls();
                this.closeAusborgenModal();
                this.globalDataService.erstelleMessage('success', 'Inventar erfolgreich ausgeborgt.');
              } catch (e: any) {
                this.globalDataService.erstelleMessage('error', e);
              }
            },
            error: (error: any) => this.globalDataService.errorAnzeigen(error),
          });
        } catch (e: any) {
          this.globalDataService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => this.globalDataService.errorAnzeigen(error),
    });
  }

  private createLeihEintrag(source?: Partial<IVerleihungFormEintrag>): IVerleihungFormEintrag {
    return {
      an: (source?.an ?? '').trim(),
      anzahl: Number(source?.anzahl ?? 1) > 0 ? Number(source?.anzahl ?? 1) : 1,
      bis: (source?.bis ?? '').trim(),
    };
  }

  private getVerleihungenAusInventar(element: IInventar): IInventarVerleihung[] {
    const apiEntries = Array.isArray(element.verleihungen) ? element.verleihungen : [];
    const normalizedEntries = apiEntries
      .map((eintrag: any) => {
        const an = String(eintrag?.an ?? '').trim();
        const anzahl = Number(eintrag?.anzahl ?? 0);
        const bisRaw = eintrag?.bis;
        const bis = bisRaw ? String(bisRaw).trim() : null;
        return {
          an,
          anzahl: Number.isFinite(anzahl) && anzahl > 0 ? Math.trunc(anzahl) : 0,
          bis: bis || null,
        } as IInventarVerleihung;
      })
      .filter((eintrag) => eintrag.an !== '' && eintrag.anzahl > 0);

    if (normalizedEntries.length > 0) {
      return normalizedEntries;
    }

    const legacyAn = String(element.verliehen_an ?? '').trim();
    const legacyAnzahl = Number(element.verliehen_anzahl ?? 0);
    const legacyBis = element.verliehen_bis ? String(element.verliehen_bis).trim() : null;
    const hasLegacy = element.ist_verliehen === true || legacyAnzahl > 0 || legacyAn !== '' || Boolean(legacyBis);

    if (!hasLegacy || legacyAn === '') {
      return [];
    }

    return [{
      an: legacyAn,
      anzahl: legacyAnzahl > 0 ? Math.trunc(legacyAnzahl) : 1,
      bis: legacyBis || null,
    }];
  }

  getLeihstatusText(element: IInventar): string {
    const verleihungen = this.getVerleihungenAusInventar(element);
    const verliehenAnzahl = verleihungen.reduce((sum, eintrag) => sum + (eintrag.anzahl || 0), 0);
    const gesamtAnzahl = Number(element.anzahl ?? 0);

    if (verliehenAnzahl <= 0) {
      return 'Verfügbar';
    }

    const mengenInfo = gesamtAnzahl > 0
      ? `${verliehenAnzahl}/${gesamtAnzahl} verliehen`
      : `${verliehenAnzahl} verliehen`;

    if (verleihungen.length === 1) {
      const verliehung = verleihungen[0];
      const verliehenBis = verliehung.bis ? this.formatService.formatDatum(verliehung.bis) : '';
      if (verliehenBis) {
        return `${mengenInfo} an ${verliehung.an} (bis ${verliehenBis})`;
      }
      return `${mengenInfo} an ${verliehung.an}`;
    }

    const bisCandidates = verleihungen
      .map((eintrag) => eintrag.bis)
      .filter((value): value is string => typeof value === 'string' && value !== '')
      .sort();
    if (bisCandidates.length > 0) {
      return `${mengenInfo} (${verleihungen.length} Entlehner, naechste Rueckgabe ${this.formatService.formatDatum(bisCandidates[0])})`;
    }

    return `${mengenInfo} (${verleihungen.length} Entlehner)`;
  }

  private buildLeihdatenPayload(gesamtAnzahl: number): {
    error: string | null;
    payload: {
      ist_verliehen: boolean;
      verliehen_anzahl: number;
      verliehen_an: string | null;
      verliehen_bis: string | null;
      verleihungen: IInventarVerleihung[];
    };
  } {
    const istVerliehen = this.formModul.controls['ist_verliehen'].value === true;
    const clearPayload = {
      ist_verliehen: false,
      verliehen_anzahl: 0,
      verliehen_an: null,
      verliehen_bis: null,
      verleihungen: [],
    };

    if (!istVerliehen) {
      return { error: null, payload: clearPayload };
    }

    const verleihungen: IInventarVerleihung[] = [];

    for (let index = 0; index < this.verleihungenForm.length; index++) {
      const eintrag = this.verleihungenForm[index];
      const an = (eintrag.an ?? '').trim();
      const anzahl = Number(eintrag.anzahl ?? 0);
      const bis = (eintrag.bis ?? '').trim();

      const hasInput = an !== '' || anzahl > 0 || bis !== '';
      if (!hasInput) {
        continue;
      }

      if (!an) {
        return {
          error: `Verleihung ${index + 1}: Bitte Empfaenger angeben.`,
          payload: clearPayload,
        };
      }

      if (!Number.isInteger(anzahl) || anzahl <= 0) {
        return {
          error: `Verleihung ${index + 1}: Anzahl muss eine ganze Zahl groesser 0 sein.`,
          payload: clearPayload,
        };
      }

      verleihungen.push({
        an,
        anzahl,
        bis: bis || null,
      });
    }

    if (verleihungen.length === 0) {
      return {
        error: 'Bitte mindestens eine Verleihung erfassen oder den Haken bei "Aktuell verliehen" entfernen.',
        payload: clearPayload,
      };
    }

    if (gesamtAnzahl <= 0) {
      return {
        error: 'Fuer eine Verleihung muss die Gesamtanzahl groesser 0 sein.',
        payload: clearPayload,
      };
    }

    const verliehenGesamt = verleihungen.reduce((sum, eintrag) => sum + eintrag.anzahl, 0);
    if (verliehenGesamt > gesamtAnzahl) {
      return {
        error: 'Verliehene Anzahl darf die Gesamtanzahl nicht ueberschreiten.',
        payload: clearPayload,
      };
    }

    const bisCandidates = verleihungen
      .map((eintrag) => eintrag.bis)
      .filter((value): value is string => typeof value === 'string' && value !== '')
      .sort();

    return {
      error: null,
      payload: {
        ist_verliehen: true,
        verliehen_anzahl: verliehenGesamt,
        verliehen_an: verleihungen.length === 1 ? verleihungen[0].an : 'Mehrere Entlehner',
        verliehen_bis: bisCandidates.length > 0 ? bisCandidates[0] : null,
        verleihungen,
      },
    };
  }

  datenLoeschen(): void {
    const id = this.formModul.controls['id'].value!;
    this.globalDataService.delete(this.modul, id).subscribe({
      next: (erg: any) => {
        try {
          this.inventarArray = this.inventarArray.filter(n => n.id !== id);
          this.dataSource.data = this.inventarArray;
          this.resetFormNachAktion();
          this.globalDataService.erstelleMessage('success', 'Inventar erfolgreich gelöscht!');
        } catch (e: any) {
          this.globalDataService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => this.globalDataService.errorAnzeigen(error)
    });
  }

  auswahlBearbeiten(element: any): void {
    if (element.id === 0) {
      return;
    }
    const abfrageUrl = `${this.modul}/${element.id}`;
    this.globalDataService.get(abfrageUrl).subscribe({
      next: (erg: any) => {
        try {
          let details: IInventar = erg;
          this.formModul.enable();
          this.btnUploadStatus = true;

          // UI-Status für bestehendes Bild
          if ((details as any).foto_url) {
            this.btnText = 'Bild ersetzen';
            const parts = (details as any).foto_url.split('/');
            this.fileName = parts[parts.length - 1];
            this.fileFound = true;
            this.filePfad = (details as any).foto_url;
          } else {
            this.btnText = 'Bild auswählen';
            this.fileName = '';
            this.fileFound = false;
            this.filePfad = '';
          }

          this.formModul.setValue({
            id: details.id!,
            bezeichnung: details.bezeichnung,
            anzahl: details.anzahl ?? 0,
            lagerort: details.lagerort ?? '',
            ist_verliehen: details.ist_verliehen === true,
            notiz: details.notiz ?? '',
            foto_url: ''
          });

          const verleihungen = this.getVerleihungenAusInventar(details);
          this.verleihungenForm = verleihungen.map((eintrag) =>
            this.createLeihEintrag({
              an: eintrag.an,
              anzahl: eintrag.anzahl,
              bis: eintrag.bis ?? '',
            })
          );
          if (this.isVerliehenAktiv() && this.verleihungenForm.length === 0) {
            this.verleihungenForm = [this.createLeihEintrag()];
          }
        } catch (e: any) {
          this.globalDataService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => this.globalDataService.errorAnzeigen(error)
    });
  }

  abbrechen(): void {
    this.globalDataService.erstelleMessage('info', 'Inventar nicht gespeichert!');
    this.router.navigate(['/inventar']);
  }

  neueDetails(): void {
    this.formModul.enable();
    this.btnUploadStatus = true;
    this.btnText = 'Bild auswählen';
    this.fileName = '';
    this.filePfad = '';
    this.fileFound = false;
    this.formModul.patchValue({
      id: '',
      bezeichnung: '',
      anzahl: 0,
      lagerort: '',
      ist_verliehen: false,
      notiz: '',
      foto_url: ''
    });
    this.verleihungenForm = [];

    // Datei-Auswahl im Input zurücksetzen
    if (this.fotoRef?.nativeElement) {
      this.fotoRef.nativeElement.value = '';
    }
  }

  datenSpeichern(): void {
    const idValue = this.formModul.controls['id'].value || '';
    const bezeichnung = this.formModul.controls['bezeichnung'].value!;
    const anzahl = this.formModul.controls['anzahl'].value ?? 0;
    const lagerort = this.formModul.controls['lagerort'].value ?? '';
    const notiz = this.formModul.controls['notiz'].value ?? '';
    const leihdatenResult = this.buildLeihdatenPayload(anzahl);
    const leihdaten = leihdatenResult.payload;
    const file = this.getSelectedFile();

    if (leihdatenResult.error) {
      this.globalDataService.erstelleMessage('error', leihdatenResult.error);
      return;
    }

    const payload = {
      bezeichnung,
      anzahl,
      lagerort,
      notiz,
      ...leihdaten,
    };

    if (!idValue) {
      // CREATE
      if (file) {
        const fd = new FormData();
        fd.append('bezeichnung', payload.bezeichnung);
        fd.append('anzahl', payload.anzahl.toString());
        fd.append('lagerort', payload.lagerort);
        fd.append('notiz', payload.notiz);
        fd.append('ist_verliehen', `${payload.ist_verliehen}`);
        fd.append('verliehen_anzahl', `${payload.verliehen_anzahl}`);
        fd.append('verliehen_an', payload.verliehen_an ?? '');
        fd.append('verliehen_bis', payload.verliehen_bis ?? '');
        fd.append('verleihungen', JSON.stringify(payload.verleihungen));
        fd.append('foto', file, file.name || 'upload.png');

        this.globalDataService.post(this.modul, fd, true).subscribe({
          next: (erg: any) => {
            try {
              const newMask: IInventar = erg;
              this.inventarArray.push(newMask);
              this.inventarArray = this.globalDataService.arraySortByKey(this.inventarArray, 'bezeichnung');
              this.dataSource.data = this.inventarArray;
              this.bindTableControls();
              this.resetFormNachAktion();
              this.globalDataService.erstelleMessage('success', 'Inventar erfolgreich gespeichert!');
            } catch (e: any) {
              this.globalDataService.erstelleMessage('error', e);
            }
          },
          error: (error: any) => this.globalDataService.errorAnzeigen(error)
        });
      } else {
        // JSON ohne Bild
        this.globalDataService.post(this.modul, payload, false).subscribe({
          next: (erg: any) => {
            try {
              const newMask: IInventar = erg;
              this.inventarArray.push(newMask);
              this.inventarArray = this.globalDataService.arraySortByKey(this.inventarArray, 'bezeichnung');
              this.dataSource.data = this.inventarArray;
              this.bindTableControls();
              this.resetFormNachAktion();
              this.globalDataService.erstelleMessage('success', 'Inventar erfolgreich gespeichert!');
            } catch (e: any) {
              this.globalDataService.erstelleMessage('error', e);
            }
          },
          error: (error: any) => this.globalDataService.errorAnzeigen(error)
        });
      }
    } else {
      // UPDATE
      if (file) {
        const fd = new FormData();
        fd.append('bezeichnung', payload.bezeichnung);
        fd.append('anzahl', payload.anzahl.toString());
        fd.append('lagerort', payload.lagerort);
        fd.append('notiz', payload.notiz);
        fd.append('ist_verliehen', `${payload.ist_verliehen}`);
        fd.append('verliehen_anzahl', `${payload.verliehen_anzahl}`);
        fd.append('verliehen_an', payload.verliehen_an ?? '');
        fd.append('verliehen_bis', payload.verliehen_bis ?? '');
        fd.append('verleihungen', JSON.stringify(payload.verleihungen));
        fd.append('foto', file, file.name || 'upload.png');

        this.globalDataService.patch(this.modul, idValue, fd, true).subscribe({
          next: (erg: any) => {
            try {
              const updated: any = erg;
              this.inventarArray = this.inventarArray
                .map(m => m.id === updated.id ? updated : m)
                .sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung, 'de'));

              this.dataSource.data = this.inventarArray;
              this.bindTableControls();
              this.resetFormNachAktion();
              this.globalDataService.erstelleMessage('success', 'Inventar erfolgreich geändert!');
            } catch (e: any) {
              this.globalDataService.erstelleMessage('error', e);
            }
          },
          error: (error: any) => this.globalDataService.errorAnzeigen(error)
        });
      } else {
        // Nur Text/Titel ändern (JSON)
        this.globalDataService.patch(this.modul, idValue, payload, false).subscribe({
          next: (erg: any) => {
            try {
              const updated: any = erg;
              this.inventarArray = this.inventarArray
                .map(m => m.id === updated.id ? updated : m)
                .sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung, 'de'));

              this.dataSource.data = this.inventarArray;
              this.bindTableControls();
              this.resetFormNachAktion();
              this.globalDataService.erstelleMessage('success', 'Inventar erfolgreich geändert!');
            } catch (e: any) {
              this.globalDataService.erstelleMessage('error', e);
            }
          },
          error: (error: any) => this.globalDataService.errorAnzeigen(error)
        });
      }
    }
  }

  onFotoSelected(event: Event): void {
    const file = this.getSelectedFile();
    if (!file) {
      this.fileFound = false;
      this.fileName = '';
      return;
    }
    const sizeKB = Math.round(file.size / 1024);
    if (sizeKB >= this.globalDataService.MaxUploadSize) {
      this.fileFound = false;
      this.fileName = '';
      const maxMB = this.globalDataService.MaxUploadSize / 1024;
      this.globalDataService.erstelleMessage('error', `Foto darf nicht größer als ${maxMB}MB sein!`);
      // Input leeren
      if (this.fotoRef?.nativeElement) this.fotoRef.nativeElement.value = '';
    } else {
      this.fileFound = true;
      this.fileName = file.name;
    }
  }

  openModal(): void {
    const modal: any = document.getElementById('myModal');
    if (modal) modal.style.display = 'block';
  }

  closeModal(): void {
    const modal: any = document.getElementById('myModal');
    if (modal) modal.style.display = 'none';
  }

  /** Nach Create/Update Formular, UI & File-Input zurücksetzen */
  private resetFormNachAktion(): void {
    this.formModul.reset({
      id: '',
      bezeichnung: '',
      anzahl: 0,
      lagerort: '',
      ist_verliehen: false,
      notiz: '',
      foto_url: ''
    });
    this.verleihungenForm = [];
    this.formModul.disable();
    this.btnUploadStatus = false;
    this.btnText = 'Bild auswählen';
    this.fileName = '';
    this.filePfad = '';
    this.fileFound = false;
    // Datei im Input löschen
    if (this.fotoRef?.nativeElement) {
      this.fotoRef.nativeElement.value = '';
    }
  }

  private observeLeihstatus(): void {
    this.formModul.controls['ist_verliehen'].valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((istVerliehen) => {
        if (istVerliehen !== true) {
          this.verleihungenForm = [];
        } else if (this.verleihungenForm.length === 0) {
          this.verleihungenForm = [this.createLeihEintrag()];
        }
      });
  }

  private bindTableControls(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }
}
