import { IInventar } from './../_interface/inventar';
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

  formModul = new FormGroup({
    id: new FormControl<string | ''>(''),
    bezeichnung: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    anzahl: new FormControl<number>(0),
    lagerort: new FormControl<string>(''),
    ist_verliehen: new FormControl<boolean>(false, { nonNullable: true }),
    verliehen_an: new FormControl<string>(''),
    verliehen_bis: new FormControl<string>(''),
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

  getLeihstatusText(element: IInventar): string {
    if (element.ist_verliehen !== true) {
      return 'Verfügbar';
    }

    const verliehenAn = (element.verliehen_an ?? '').trim();
    const verliehenBis = element.verliehen_bis
      ? this.formatService.formatDatum(element.verliehen_bis)
      : '';

    if (verliehenAn && verliehenBis) {
      return `Verliehen an ${verliehenAn} (bis ${verliehenBis})`;
    }
    if (verliehenAn) {
      return `Verliehen an ${verliehenAn}`;
    }
    if (verliehenBis) {
      return `Verliehen (bis ${verliehenBis})`;
    }
    return 'Verliehen';
  }

  private buildLeihdatenPayload(): {
    ist_verliehen: boolean;
    verliehen_an: string | null;
    verliehen_bis: string | null;
  } {
    const istVerliehen = this.formModul.controls['ist_verliehen'].value === true;
    const verliehenAn = (this.formModul.controls['verliehen_an'].value ?? '').trim();
    const verliehenBis = (this.formModul.controls['verliehen_bis'].value ?? '').trim();

    if (!istVerliehen) {
      return {
        ist_verliehen: false,
        verliehen_an: null,
        verliehen_bis: null,
      };
    }

    return {
      ist_verliehen: true,
      verliehen_an: verliehenAn || null,
      verliehen_bis: verliehenBis || null,
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
            verliehen_an: details.verliehen_an ?? '',
            verliehen_bis: details.verliehen_bis ?? '',
            notiz: details.notiz ?? '',
            foto_url: ''
          });
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
      verliehen_an: '',
      verliehen_bis: '',
      notiz: '',
      foto_url: ''
    });

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
    const leihdaten = this.buildLeihdatenPayload();
    const file = this.getSelectedFile();

    if (leihdaten.ist_verliehen && !leihdaten.verliehen_an) {
      this.formModul.controls['verliehen_an'].markAsTouched();
      this.globalDataService.erstelleMessage('error', 'Bitte angeben, an wen der Gegenstand verliehen wird.');
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
        fd.append('verliehen_an', payload.verliehen_an ?? '');
        fd.append('verliehen_bis', payload.verliehen_bis ?? '');
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
        fd.append('verliehen_an', payload.verliehen_an ?? '');
        fd.append('verliehen_bis', payload.verliehen_bis ?? '');
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
      verliehen_an: '',
      verliehen_bis: '',
      notiz: '',
      foto_url: ''
    });
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
          this.formModul.patchValue(
            {
              verliehen_an: '',
              verliehen_bis: '',
            },
            { emitEvent: false }
          );
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
