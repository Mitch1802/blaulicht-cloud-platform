import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
import {
  ImrBreadcrumbItem,
  ImrHeaderComponent,
  ImrPageLayoutComponent,
  ImrSectionComponent,
} from '../imr-ui-library';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IStammdaten } from '../_interface/stammdaten';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { IPdfTemplate } from '../_interface/pdf_template';
import { MatTableModule } from '@angular/material/table';

type RechnungPosition = {
  bezeichnung: string;
  preis: number;
};

type SevdeskKontakt = {
  id: string | number;
  name: string;
};

type ModulKonfigurationEintrag = {
  id?: number;
  modul?: string;
  konfiguration?: Record<string, unknown>;
};

type ModulKonfigurationResponse = {
  user?: { roles?: string[] | string };
  main?: ModulKonfigurationEintrag[];
} | ModulKonfigurationEintrag[];

type ModulKonfigurationSaveResult = {
  id: number;
  modul: string;
  konfiguration?: Record<string, unknown>;
};

type PdfTemplatesResponse = { main?: IPdfTemplate[] } | IPdfTemplate[];

type VerwaltungResponse = {
  sevdesk?: { objects?: SevdeskKontakt[] };
  modul_konfig?: ModulKonfigurationEintrag[];
  konfig?: IStammdaten[];
};

type KontaktAddressEintrag = {
  contact?: { id?: string | number };
  street?: string;
  zip?: string;
  city?: string;
};

type VerwaltungKontakteResponse = {
  Contact?: SevdeskKontakt[];
  ContactAddress?: KontaktAddressEintrag[];
};

@Component({
  selector: 'app-verwaltung',
  standalone: true,
  imports: [
    CommonModule,
    ImrHeaderComponent,
    ImrPageLayoutComponent,
    ImrSectionComponent,
    MatTabsModule,
    MatButtonModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    FormsModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatOptionModule,
    MatTableModule,
  ],
  templateUrl: './verwaltung.component.html',
  styleUrl: './verwaltung.component.sass'
})
export class VerwaltungComponent implements OnInit {
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  private readonly adminRoleKey = 'ADMIN';
  private readonly modulKonfigurationEndpoint = 'modul_konfiguration';
  title = 'Verwaltung';
  modul = 'verwaltung';

  breadcrumb: ImrBreadcrumbItem[] = [];
  meine_rollen: string[] = [];
  pdfKonfigId: number | null = null;
  pdf_konfig: Record<string, unknown> = {};
  pdfTemplates: IPdfTemplate[] = [];
  private pdfTemplatesLoaded = false;
  stammdaten: IStammdaten | null = null;
  kontakte: SevdeskKontakt[] = [];

  /** erlaubt: 12 | 12,5 | 12,50 | 12.50 */
  private readonly PREIS_REGEX = /^\d+([.,]\d{1,2})?$/;

  formAuswahl = new FormGroup({
    name: new FormControl('')
  });

  formPdfSettings = new FormGroup({
    idVerwaltungRechnung: new FormControl<string | null>(null),
    idVerwaltungTombola: new FormControl<string | null>(null),
  });

  formRechnung = new FormGroup({
    invoice_nummer: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    adress_name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    adresse_strasse: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    adresse_plz: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    adresse_ort: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    betreff: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    anrede: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    text: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    positionen: new FormControl<RechnungPosition[]>([], {
      nonNullable: true,
      validators: [Validators.required]
    })
  });

  formRechnungPositionen = new FormGroup({
    bezeichnung: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    preis: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(this.PREIS_REGEX)
      ]
    })
  });

  formatPreis(p: number): string {
    return p.toFixed(2).replace('.', ',');
  }

  readonly sichtbareSpaltenPositionen: string[] = ['bezeichnung', 'preis', 'actions'];

  get isAdmin(): boolean {
    return this.meine_rollen.includes(this.adminRoleKey);
  }

  ngOnInit(): void {
    sessionStorage.setItem('PageNumber', '2');
    sessionStorage.setItem('Page2', 'VER');

    this.breadcrumb = this.navigationService.ladeBreadcrumb();

    let param = {
      'includeSevdesk': '1',
      'sevdeskModul': 'Contact'
    };

    this.apiHttpService.get<VerwaltungResponse>(this.modul, param).subscribe({
      next: (erg: VerwaltungResponse) => {
        try {
          this.kontakte = erg.sevdesk?.objects ?? [];
          const templates = (erg.modul_konfig ?? []).find((m: ModulKonfigurationEintrag) => m.modul === 'pdf');
          this.pdf_konfig = templates?.konfiguration ?? {};
          this.stammdaten = erg.konfig?.[0] ?? null;
          this.syncPdfSettingsForm();
        } catch (e: unknown) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: unknown) => this.authSessionService.errorAnzeigen(error)
    });

    this.loadPdfSettingsContext();
  }

  savePdfSettings(): void {
    if (!this.isAdmin) {
      return;
    }

    const payload = {
      modul: 'pdf',
      konfiguration: {
        ...this.pdf_konfig,
        idVerwaltungRechnung: this.stringOrNull(this.formPdfSettings.controls.idVerwaltungRechnung.value),
        idVerwaltungTombola: this.stringOrNull(this.formPdfSettings.controls.idVerwaltungTombola.value),
      },
    };

    if (this.pdfKonfigId) {
      this.apiHttpService.patch<ModulKonfigurationSaveResult>(this.modulKonfigurationEndpoint, this.pdfKonfigId, payload, false).subscribe({
        next: (saved) => {
          this.applySavedPdfKonfig(saved);
          this.uiMessageService.erstelleMessage('success', 'PDF-Zuweisungen gespeichert.');
        },
        error: (error: unknown) => this.authSessionService.errorAnzeigen(error),
      });
      return;
    }

    this.apiHttpService.post<ModulKonfigurationSaveResult>(this.modulKonfigurationEndpoint, payload, false).subscribe({
      next: (saved) => {
        this.applySavedPdfKonfig(saved);
        this.uiMessageService.erstelleMessage('success', 'PDF-Zuweisungen gespeichert.');
      },
      error: (error: unknown) => this.authSessionService.errorAnzeigen(error),
    });
  }

  resetPdfSettings(): void {
    this.syncPdfSettingsForm();
  }

  private parsePreis(input: string): number | null {
    const s = input.trim();
    if (!this.PREIS_REGEX.test(s)) return null;

    const normalized = s.replace(',', '.');
    const value = Number(normalized);
    return Number.isFinite(value) ? value : null;
  }

  addPosition(): void {
    if (this.formRechnungPositionen.invalid) {
      this.formRechnungPositionen.markAllAsTouched();
      return;
    }

    const bezeichnung = this.formRechnungPositionen.controls.bezeichnung.value.trim();
    const preisText = this.formRechnungPositionen.controls.preis.value.trim();

    const preis = this.parsePreis(preisText);
    if (preis === null) {
      this.formRechnungPositionen.controls.preis.setErrors({ pattern: true });
      this.formRechnungPositionen.controls.preis.markAsTouched();
      return;
    }

    const current = this.formRechnung.controls.positionen.value;
    this.formRechnung.controls.positionen.setValue([
      ...current,
      { bezeichnung, preis }
    ]);

    this.formRechnung.controls.positionen.markAsDirty();
    this.formRechnungPositionen.reset({ bezeichnung: '', preis: '' });
  }

  removePosition(index: number): void {
    const current = this.formRechnung.controls.positionen.value;
    if (index < 0 || index >= current.length) return;

    this.formRechnung.controls.positionen.setValue(
      current.filter((_, i) => i !== index)
    );

    this.formRechnung.controls.positionen.markAsDirty();
  }

  formRechnungReset(): void {
    this.formRechnung.reset({
      invoice_nummer: '',
      adress_name: '',
      adresse_strasse: '',
      adresse_plz: '',
      adresse_ort: '',
      betreff: '',
      anrede: '',
      text: '',
      positionen: []
    });
  }

  printRechnung(): void {
    if (this.formRechnung.invalid) {
      this.formRechnung.markAllAsTouched();
      this.uiMessageService.erstelleMessage('error', 'Rechnung unvollständig. Bitte alle Pflichtfelder inkl. mindestens einer Position ausfüllen.');
      return;
    }

    if (!this.stammdaten) {
      this.uiMessageService.erstelleMessage('error', 'Stammdaten nicht geladen. Bitte Seite neu laden und erneut versuchen.');
      return;
    }

    const idVerwaltungRechnung = String(this.pdf_konfig['idVerwaltungRechnung'] ?? '').trim();
    if (!idVerwaltungRechnung) {
      this.uiMessageService.erstelleMessage('error', 'Kein PDF-Template konfiguriert. Bitte die PDF-Zuordnung im Einstellungstab pflegen.');
      return;
    }

    const abfrageUrl = `pdf/templates/${idVerwaltungRechnung}/render`;

    const heute = new Date().toLocaleDateString('de-DE');
    const pos = this.formRechnung.controls.positionen.value;
    if (!Array.isArray(pos) || pos.length === 0) {
      this.uiMessageService.erstelleMessage('error', 'Mindestens eine Rechnungsposition ist erforderlich.');
      return;
    }

    const betrag_total = pos.reduce((sum, p) => sum + p.preis, 0);

    const invoice_items = pos.map(p => ({
      bezeichnung: p.bezeichnung,
      preis: p.preis.toFixed(2)
    }));

    const payload = {
      fw_name: this.stammdaten.fw_name,
      fw_nummer: this.stammdaten.fw_nummer,
      fw_street: this.stammdaten.fw_street,
      fw_plz: this.stammdaten.fw_plz,
      fw_ort: this.stammdaten.fw_ort,
      fw_email: this.stammdaten.fw_email,
      fw_telefon: this.stammdaten.fw_telefon,
      fw_konto: this.stammdaten.fw_konto,
      fw_iban: this.stammdaten.fw_iban,
      fw_bic: this.stammdaten.fw_bic,
      fw_kdt: this.stammdaten.fw_kdt,
      invoice_datum: heute,
      invoice_nummer: this.formRechnung.controls.invoice_nummer.value,
      customer_name: this.formRechnung.controls.adress_name.value,
      customer_street: this.formRechnung.controls.adresse_strasse.value,
      customer_plz: this.formRechnung.controls.adresse_plz.value,
      customer_ort: this.formRechnung.controls.adresse_ort.value,
      invoice_betreff: this.formRechnung.controls.betreff.value,
      invoice_anrede: this.formRechnung.controls.anrede.value,
      invoice_text: this.formRechnung.controls.text.value,
      invoice_items,
      invoice_total_betrag: betrag_total.toFixed(2)
    };

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.uiMessageService.erstelleMessage('error', 'Popup blockiert. Bitte Popups für diese Seite erlauben und erneut drucken.');
      return;
    }

    this.apiHttpService.postBlob(abfrageUrl, payload).subscribe({
      next: (blob: Blob) => {
        if (!blob || blob.size === 0) {
          printWindow.close();
          this.uiMessageService.erstelleMessage('error', 'PDF ist leer (0 Bytes).');
          return;
        }
        const pdfUrl = URL.createObjectURL(blob);
        printWindow.location.href = pdfUrl;
      },
      error: (error: unknown) => {
        printWindow.close();
        this.handlePrintError(error);
      }
    });
  }

  private handlePrintError(error: unknown): void {
    void this.resolvePrintErrorMessage(error).then((message) => {
      if (message) {
        this.uiMessageService.erstelleMessage('error', message);
        return;
      }
      this.authSessionService.errorAnzeigen(error);
    });
  }

  private async resolvePrintErrorMessage(error: unknown): Promise<string> {
    if (!(error instanceof HttpErrorResponse)) {
      return '';
    }

    const payload = error.error;
    if (payload instanceof Blob) {
      const text = (await payload.text()).trim();
      if (!text) {
        return `Druck fehlgeschlagen (HTTP ${error.status || 'unbekannt'}).`;
      }

      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        const msg = Object.values(parsed).map((v) => String(v)).join('\n').trim();
        return msg || `Druck fehlgeschlagen (HTTP ${error.status || 'unbekannt'}).`;
      } catch {
        return text.slice(0, 400);
      }
    }

    if (typeof payload === 'string' && payload.trim() !== '') {
      return payload.trim();
    }

    return '';
  }

  private loadPdfSettingsContext(): void {
    this.apiHttpService.get<ModulKonfigurationResponse>(this.modulKonfigurationEndpoint).subscribe({
      next: (erg) => {
        this.meine_rollen = this.extractRolesFromPayload(erg);
        const eintraege = this.normalizeModulKonfigEntries(erg);
        const pdfEntry = eintraege.find((item) => String(item.modul ?? '').trim().toLowerCase() === 'pdf');
        this.pdfKonfigId = typeof pdfEntry?.id === 'number' ? pdfEntry.id : null;
        this.pdf_konfig = pdfEntry?.konfiguration ?? this.pdf_konfig;
        this.syncPdfSettingsForm();

        if (this.isAdmin) {
          this.loadPdfTemplatesOnce();
        }
      },
      error: () => {
        this.meine_rollen = [];
        this.pdfKonfigId = null;
        this.syncPdfSettingsForm();
      },
    });
  }

  private loadPdfTemplatesOnce(): void {
    if (this.pdfTemplatesLoaded) {
      return;
    }

    this.apiHttpService.get<PdfTemplatesResponse>('pdf/templates').subscribe({
      next: (erg) => {
        this.pdfTemplates = Array.isArray(erg) ? erg : (erg.main ?? []);
        this.pdfTemplatesLoaded = true;
      },
      error: (error: unknown) => this.authSessionService.errorAnzeigen(error),
    });
  }

  private syncPdfSettingsForm(): void {
    this.formPdfSettings.patchValue({
      idVerwaltungRechnung: this.stringOrNull(this.pdf_konfig['idVerwaltungRechnung']),
      idVerwaltungTombola: this.stringOrNull(this.pdf_konfig['idVerwaltungTombola']),
    }, { emitEvent: false });
    this.formPdfSettings.markAsPristine();
    this.formPdfSettings.markAsUntouched();
  }

  private applySavedPdfKonfig(saved: ModulKonfigurationSaveResult): void {
    this.pdfKonfigId = saved.id;
    this.pdf_konfig = saved.konfiguration ?? {};
    this.syncPdfSettingsForm();
  }

  private normalizeModulKonfigEntries(payload: unknown): ModulKonfigurationEintrag[] {
    if (Array.isArray(payload)) {
      return payload as ModulKonfigurationEintrag[];
    }

    if (payload && typeof payload === 'object') {
      const main = (payload as { main?: unknown }).main;
      if (Array.isArray(main)) {
        return main as ModulKonfigurationEintrag[];
      }
    }

    return [];
  }

  private extractRolesFromPayload(payload: unknown): string[] {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return [];
    }

    return this.normalizeRoles((payload as { user?: { roles?: unknown } }).user?.roles);
  }

  private normalizeRoles(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim().toUpperCase()).filter(Boolean);
    }

    return String(value ?? '')
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
  }

  private stringOrNull(value: unknown): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    return String(value);
  }

  sevdeskKontaktUebernehmen(): void {
    const kontaktId = this.formAuswahl.controls.name.value;
    if (!kontaktId) return;

    this.apiHttpService.get<VerwaltungKontakteResponse>('verwaltung/kontakte').subscribe({
      next: (erg: VerwaltungKontakteResponse) => {
        try {
          const kontakte = erg.Contact ?? [];
          const kontaktAdressen = erg.ContactAddress ?? [];

          const kontakt = kontakte.find((m: SevdeskKontakt) => String(m.id) === kontaktId);
          const kontaktAddresse = kontaktAdressen.find((m: KontaktAddressEintrag) => String(m.contact?.id ?? '') === kontaktId);
          this.formRechnung.controls.adress_name.setValue(kontakt?.name ?? '');
          this.formRechnung.controls.adresse_strasse.setValue(kontaktAddresse?.street ?? '');
          this.formRechnung.controls.adresse_plz.setValue(kontaktAddresse?.zip ?? '');
          this.formRechnung.controls.adresse_ort.setValue(kontaktAddresse?.city ?? '');
        } catch (e: unknown) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: unknown) => this.authSessionService.errorAnzeigen(error)
    });
    
  }
}

