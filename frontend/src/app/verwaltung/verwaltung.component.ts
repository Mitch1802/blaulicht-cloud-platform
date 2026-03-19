import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
import { MatCardModule } from '@angular/material/card';
import {
  ImrCardContentComponent,
  ImrHeaderComponent,
  ImrListComponent,
  ImrListItemComponent,
} from '../imr-ui-library';
import { MatTabsModule } from '@angular/material/tabs';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IStammdaten } from '../_interface/stammdaten';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';

type RechnungPosition = {
  bezeichnung: string;
  preis: number;
};

@Component({
  selector: 'app-verwaltung',
  standalone: true,
  imports: [
    CommonModule,
    ImrHeaderComponent,
    ImrCardContentComponent,
    ImrListComponent,
    ImrListItemComponent,
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatOptionModule
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
  title = 'Verwaltung';
  modul = 'verwaltung';

  breadcrumb: any = [];
  pdf_konfig: any = {};
  stammdaten: IStammdaten | null = null;
  kontakte: any = [];

  /** erlaubt: 12 | 12,5 | 12,50 | 12.50 */
  private readonly PREIS_REGEX = /^\d+([.,]\d{1,2})?$/;

  formAuswahl = new FormGroup({
    name: new FormControl('')
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

  ngOnInit(): void {
    sessionStorage.setItem('PageNumber', '2');
    sessionStorage.setItem('Page2', 'VER');

    this.breadcrumb = this.navigationService.ladeBreadcrumb();

    let param = {
      'includeSevdesk': '1',
      'sevdeskModul': 'Contact'
    };

    this.apiHttpService.get(this.modul, param).subscribe({
      next: (erg: any) => {
        try {
          this.kontakte = erg.sevdesk.objects ?? [];
          const templates = erg.modul_konfig.find((m: any) => m.modul === 'pdf');
          this.pdf_konfig = templates?.konfiguration ?? {};
          this.stammdaten = erg.konfig?.[0] ?? null;
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => this.authSessionService.errorAnzeigen(error)
    });
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
    if (this.formRechnung.valid == false) return;
    if (!this.stammdaten) return;

    const idVerwaltungRechnung = this.pdf_konfig['idVerwaltungRechnung'];
    const abfrageUrl = `pdf/templates/${idVerwaltungRechnung}/render`;

    const heute = new Date().toLocaleDateString('de-DE');
    const pos = this.formRechnung.controls.positionen.value;

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

    this.apiHttpService.postBlob(abfrageUrl, payload).subscribe({
      next: (blob: Blob) => {
        if (!blob || blob.size === 0) {
          this.uiMessageService.erstelleMessage('error', 'PDF ist leer (0 Bytes).');
          return;
        }
        window.open(URL.createObjectURL(blob), '_blank');
      },
      error: (error: any) => this.authSessionService.errorAnzeigen(error)
    });
  }

  sevdeskKontaktUebernehmen(): void {
    const kontaktId = this.formAuswahl.controls.name.value;
    if (!kontaktId) return;

    this.apiHttpService.get('verwaltung/kontakte').subscribe({
      next: (erg: any) => {
        try {
          const kontakte = erg['Contact'];
          const kontaktAdressen = erg['ContactAddress'];

          const kontakt = kontakte.find((m: any) => m.id === kontaktId);
          const kontaktAddresse = kontaktAdressen.find((m: any) => m.contact.id === kontaktId);
          this.formRechnung.controls.adress_name.setValue(kontakt.name);
          this.formRechnung.controls.adresse_strasse.setValue(kontaktAddresse.street);
          this.formRechnung.controls.adresse_plz.setValue(kontaktAddresse.zip);
          this.formRechnung.controls.adresse_ort.setValue(kontaktAddresse.city);
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => this.authSessionService.errorAnzeigen(error)
    });
    
  }
}
