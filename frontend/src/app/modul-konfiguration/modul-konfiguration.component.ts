import { Component, OnInit, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  Validators,
  ValidatorFn,
  AbstractControl,
  ReactiveFormsModule,
  FormsModule
} from '@angular/forms';
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
import { HeaderComponent } from '../_template/header/header.component';
import { MatCardModule } from '@angular/material/card';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { Router } from '@angular/router';
import { IPdfTemplate } from '../_interface/pdf_template';
import jugendRegelConfig from '../jugend/config.json';
import startRegelConfig from '../start/konfig.json';

@Component({
  selector: 'app-modul-konfiguration',
  imports: [
    HeaderComponent,
    MatCardModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatButton,
    MatInput,
    MatError
  ],
  templateUrl: './modul-konfiguration.component.html',
  styleUrls: ['./modul-konfiguration.component.sass']
})
export class ModulKonfigurationComponent implements OnInit {
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  router = inject(Router);

  title = 'Modul Konfiguration';
  modul = 'modul_konfiguration';
  breadcrumb: any[] = [];

  verfuegbareModulListe: any = [
    { key: 'start', label: 'Startseite' },
    { key: 'fmd', label: 'FMD' },
    { key: 'jugend', label: 'Jugend' },
    { key: 'pdf', label: 'PDF Templates Zuweisung' },
  ];

  modulListe: any = [];
  private modulByKey = new Map<string, any>();

  private readonly jugendDefaultKonfiguration = jugendRegelConfig;
  private readonly startDefaultKonfiguration = startRegelConfig;

  readonly jugendTrackInfos: ReadonlyArray<{ key: string; label: string }> = [
    { key: 'erprobung', label: 'Erprobung' },
    { key: 'wissentest', label: 'Wissentest' },
    { key: 'fertigkeit_melder', label: 'Fertigkeitsabzeichen Melder' },
    { key: 'fertigkeit_fwtechnik', label: 'Fertigkeitsabzeichen FW-Technik' },
    { key: 'fertigkeit_sicher_zu_wasser', label: 'Fertigkeitsabzeichen Sicher zu Wasser' },
  ];

  readonly jugendTokenInfos: ReadonlyArray<{ token: string; label: string }> = [
    { token: 'erprobung_1', label: 'Erprobung Stufe 1' },
    { token: 'erprobung_2', label: 'Erprobung Stufe 2' },
    { token: 'erprobung_3', label: 'Erprobung Stufe 3' },
    { token: 'erprobung_4', label: 'Erprobung Stufe 4' },
    { token: 'erprobung_5', label: 'Erprobung Stufe 5' },
    { token: 'wissentest_1', label: 'Wissentest Stufe 1' },
    { token: 'wissentest_2', label: 'Wissentest Stufe 2' },
    { token: 'wissentest_3', label: 'Wissentest Stufe 3' },
    { token: 'wissentest_4', label: 'Wissentest Stufe 4' },
    { token: 'wissentest_5', label: 'Wissentest Stufe 5' },
    { token: 'fertigkeit_melder_1', label: 'Melder Spiel' },
    { token: 'fertigkeit_melder_2', label: 'Melder Abzeichen' },
    { token: 'fertigkeit_fwtechnik_1', label: 'FW-Technik Spiel' },
    { token: 'fertigkeit_fwtechnik_2', label: 'FW-Technik Abzeichen' },
    { token: 'fertigkeit_sicher_zu_wasser_1', label: 'Sicher zu Wasser Spiel' },
    { token: 'fertigkeit_sicher_zu_wasser_2', label: 'Sicher zu Wasser Abzeichen' },
  ];

  readonly jugendKonfigBeispiel = JSON.stringify(
    {
      regeln: {
        erprobung: {
          '3': {
            min_age: 12,
            requires_all: ['erprobung_2'],
          },
        },
        fertigkeit_melder: {
          '2': {
            min_age: 12,
            requires_all: ['fertigkeit_melder_1'],
          },
        },
      },
    },
    null,
    2,
  );

  formModul = new FormGroup({
    id: new FormControl<number | null>(null),
    modul: new FormControl<string>('', Validators.required),
    konfiguration: new FormControl<string>('', [Validators.required, this.validJson()]),
  });

  pdfExports = [
    { key: 'idFmdDeckblatt', label: 'FMD: Deckblatt (Checkliste)' },
    { key: 'idFmdListe', label: 'FMD: Listen (Tauglichkeit/Leistungstest/Untersuchungen)' },
    { key: 'idVerwaltungTombola', label: 'VERWALTUNG: Tombolabestätigung' },
    { key: 'idVerwaltungRechnung', label: 'VERWALTUNG: Rechnungsaufstellung' },
  ] as const;

  pdfTemplates: IPdfTemplate[] = [];
  private pdfTemplatesLoaded = false;

  pdfMappingForm = new FormGroup({
    idFmdDeckblatt: new FormControl<string | null>(null, Validators.required),
    idFmdListe: new FormControl<string | null>(null, Validators.required),
    idVerwaltungTombola: new FormControl<string | null>(null, Validators.required),
    idVerwaltungRechnung: new FormControl<string | null>(null, Validators.required),
  });

  ngOnInit(): void {
    sessionStorage.setItem('PageNumber', '2');
    sessionStorage.setItem('Page2', 'V_MK');
    this.breadcrumb = this.navigationService.ladeBreadcrumb();
    this.formModul.enable();
    this.formModul.controls['id'].disable();

    // Modul-Konfig laden
    this.apiHttpService.get(this.modul).subscribe({
      next: (erg: any) => {
        try {
          this.modulListe = erg.main ?? [];
          this.modulByKey = new Map(this.modulListe.map((x: any) => [x.modul, x]));
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => this.authSessionService.errorAnzeigen(error)
    });

    // Wenn user im PDF-Form was ändert => JSON-String im formModul.konfiguration mitschreiben
    this.pdfMappingForm.valueChanges.subscribe(() => {
      if (this.formModul.controls['modul'].value === 'pdf') {
        this.syncPdfMappingToKonfigurationControl();
      }
    });
  }

  onModulChange(): void {
    const key = this.formModul.controls['modul'].value;
    if (!key) return;

    const details = this.modulByKey.get(key);

    // Formular ist bereits enabled (wir bleiben immer im selben Formular)
    this.formModul.enable();

    // Neu (noch kein Datensatz)
    if (!details) {
      this.formModul.patchValue({
        id: null,
        modul: key,
        konfiguration: JSON.stringify(this.getDefaultKonfigurationForModul(key), null, 2),
      }, { emitEvent: false });

      if (key === 'pdf') {
        this.loadPdfTemplatesOnce();
        this.initPdfMappingFromConfigObject({});
      }
      return;
    }

    // Bestehend
    this.formModul.patchValue({
      id: details.id,
      modul: details.modul,
      konfiguration: JSON.stringify(details.konfiguration ?? {}, null, 2),
    }, { emitEvent: false });

    if (key === 'pdf') {
      this.loadPdfTemplatesOnce();
      this.initPdfMappingFromConfigObject(details.konfiguration ?? {});
    }
  }

  datenSpeichern(): void {
    if (this.formModul.invalid) {
      this.uiMessageService.erstelleMessage('error', 'Bitte alle Pflichtfelder korrekt ausfüllen!');
      return;
    }

    const objekt: any = this.formModul.value;
    const idValue = this.formModul.controls['id'].value;

    if (objekt.modul === 'pdf') {
      if (this.pdfMappingForm.invalid) {
        this.uiMessageService.erstelleMessage('error', 'Bitte PDF-Templates für alle Funktionen auswählen!');
        return;
      }

      objekt.konfiguration = {
        idFmdDeckblatt: this.pdfMappingForm.controls['idFmdDeckblatt'].value,
        idFmdListe: this.pdfMappingForm.controls['idFmdListe'].value,
        idVerwaltungTombola: this.pdfMappingForm.controls['idVerwaltungTombola'].value,
        idVerwaltungRechnung: this.pdfMappingForm.controls['idVerwaltungRechnung'].value,
      };

      this.formModul.controls['konfiguration'].setValue(
        JSON.stringify(objekt.konfiguration, null, 2),
        { emitEvent: false }
      );
    } else {
      objekt.konfiguration = JSON.parse(objekt.konfiguration);
    }

    if (!idValue) {
      this.apiHttpService.post(this.modul, objekt, false).subscribe({
        next: (saved: any) => {
          try {
            this.modulByKey.set(saved.modul, saved);
            this.formModul.reset();
            this.setzeSelectZurueck();
            this.uiMessageService.erstelleMessage('success', 'Konfiguration gespeichert!');
          } catch (e: any) {
            this.uiMessageService.erstelleMessage('error', e);
          }
        },
        error: (error: any) => this.authSessionService.errorAnzeigen(error)
      });
    } else {
      this.apiHttpService.patch(this.modul, idValue, objekt, false).subscribe({
        next: (saved: any) => {
          try {
            this.modulByKey.set(saved.modul, saved);
            this.formModul.reset();
            this.setzeSelectZurueck();
            this.uiMessageService.erstelleMessage('success', 'Konfiguration geändert!');
          } catch (e: any) {
            this.uiMessageService.erstelleMessage('error', e);
          }
        },
        error: (error: any) => this.authSessionService.errorAnzeigen(error)
      });
    }
  }

  datenLoeschen(): void {
    const id = this.formModul.controls['id'].value!;
    if (!id) {
      this.uiMessageService.erstelleMessage('error', 'Keine Modul Konfiguration ausgewählt zum Löschen!');
      return;
    }

    this.apiHttpService.delete(this.modul, id).subscribe({
      next: () => {
        try {
          this.modulListe = this.modulListe.filter((m: any) => m.id !== id);

          this.formModul.reset();
          this.setzeSelectZurueck();

          this.uiMessageService.erstelleMessage('success', 'Modul Konfiguration erfolgreich gelöscht!');
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => this.authSessionService.errorAnzeigen(error)
    });
  }

  setzeSelectZurueck(): void {
    this.formModul.controls['modul'].setValue('', { emitEvent: false });
  }

  // -----------------------
  // PDF helpers
  // -----------------------
  private loadPdfTemplatesOnce(): void {
    if (this.pdfTemplatesLoaded) return;

    // gleicher Endpoint wie in PdfTemplatesComponent: modul = 'pdf/templates'
    this.apiHttpService.get('pdf/templates').subscribe({
      next: (erg: any) => {
        this.pdfTemplates = (erg?.main ?? erg ?? []) as IPdfTemplate[];
        this.pdfTemplatesLoaded = true;
      },
      error: (error: any) => this.authSessionService.errorAnzeigen(error),
    });
  }

  private initPdfMappingFromConfigObject(cfg: any): void {
    this.pdfMappingForm.patchValue({
      idFmdDeckblatt: cfg?.idFmdDeckblatt ?? null,
      idFmdListe: cfg?.idFmdListe ?? null,
      idVerwaltungTombola: cfg?.idVerwaltungTombola ?? null,
      idVerwaltungRechnung: cfg?.idVerwaltungRechnung ?? null,
    }, { emitEvent: false });

    this.syncPdfMappingToKonfigurationControl();
  }

  private syncPdfMappingToKonfigurationControl(): void {
    const json = JSON.stringify(this.pdfMappingForm.value ?? {}, null, 2);
    this.formModul.controls['konfiguration'].setValue(json, { emitEvent: false });
  }

  private getDefaultKonfigurationForModul(modul: string): Record<string, unknown> {
    if (modul === 'start') {
      return JSON.parse(JSON.stringify(this.startDefaultKonfiguration));
    }
    if (modul === 'jugend') {
      return JSON.parse(JSON.stringify(this.jugendDefaultKonfiguration));
    }
    return {};
  }

  isJugendModulAusgewaehlt(): boolean {
    return this.formModul.controls['modul'].value === 'jugend';
  }

  // -----------------------
  // JSON validator
  // -----------------------
  private validJson(): ValidatorFn {
    return (control: AbstractControl) => {
      const v = control.value;
      if (!v) return null;
      try {
        JSON.parse(v);
        return null;
      } catch {
        return { jsonInvalid: true };
      }
    };
  }
}
