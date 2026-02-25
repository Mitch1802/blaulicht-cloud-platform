import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HeaderComponent } from '../_template/header/header.component';
import { GlobalDataService } from '../_service/global-data.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';

type FahrzeugOption = {
  id: number;
  label: string;
};

type MitgliedOption = {
  id: number;
  label: string;
};

type EinsatzberichtFotoDto = {
  id: string;
  foto_url?: string;
};

type EinsatzberichtDto = {
  id: string;
  status: string;
  alarmstichwort: string;
  einsatzleiter: string;
  einsatzart: string;
  einsatzadresse: string;
  alarmierende_stelle: string;
  einsatz_datum: string;
  ausgerueckt: string;
  eingerueckt: string;
  lage_beim_eintreffen: string;
  gesetzte_massnahmen: string;
  brand_kategorie: string;
  technisch_kategorie: string;
  geschaedigter_pkw: boolean;
  foto_doku: boolean;
  zulassungsschein: boolean;
  versicherungsschein: boolean;
  fahrzeuge: number[];
  mitglieder: number[];
  blaulichtsms_einsatz_id: string;
  fotos?: EinsatzberichtFotoDto[];
  created_at?: string;
};

@Component({
  standalone: true,
  selector: 'app-einsatzbericht',
  imports: [
    HeaderComponent,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatExpansionModule,
  ],
  templateUrl: './einsatzbericht.component.html',
  styleUrl: './einsatzbericht.component.sass'
})
export class EinsatzberichtComponent implements OnInit {
  private globalDataService = inject(GlobalDataService);

  title = 'Einsatzbericht';
  breadcrumb: any[] = [];

  fotoDateien: string[] = [];
  fotoFiles: File[] = [];

  einsatzarten = [
    'Brand',
    'Technisch',
    'Sonstiges'
  ];

  brandOptionen = [
    'Zimmerbrand',
    'Küchenbrand',
    'Fahrzeugbrand',
    'Flächenbrand',
    'Rauchentwicklung',
    'Brandmeldeanlage'
  ];

  technischOptionen = [
    'Verkehrsunfall',
    'Ölspur',
    'Türöffnung',
    'Unwetterschaden',
    'Geschädigter PKW'
  ];

  fahrzeugOptionen: FahrzeugOption[] = [];
  mitgliedOptionen: MitgliedOption[] = [];
  berichte: EinsatzberichtDto[] = [];
  viewMode: 'list' | 'form' = 'list';

  statusOptionen = [
    { key: 'ENTWURF', label: 'Entwurf' },
    { key: 'ABGESCHLOSSEN', label: 'Abgeschlossen' },
  ];

  formBericht = new FormGroup({
    id: new FormControl<string>('', { nonNullable: true }),
    status: new FormControl<string>('ENTWURF', { nonNullable: true, validators: [Validators.required] }),
    einsatzleiter: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    einsatzart: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    alarmstichwort: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    einsatzadresse: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    alarmierendeStelle: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    einsatzDatum: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    ausgerueckt: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    eingerueckt: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    lageBeimEintreffen: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    gesetzteMassnahmen: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    brandKategorie: new FormControl<string>('', { nonNullable: true }),
    technischKategorie: new FormControl<string>('', { nonNullable: true }),
    geschaedigterPkw: new FormControl<boolean>(false, { nonNullable: true }),
    fotoDoku: new FormControl<boolean>(false, { nonNullable: true }),
    zulassungsschein: new FormControl<boolean>(false, { nonNullable: true }),
    versicherungsschein: new FormControl<boolean>(false, { nonNullable: true }),
    fahrzeuge: new FormControl<number[]>([], { nonNullable: true }),
    mitglieder: new FormControl<number[]>([], { nonNullable: true }),
  });

  get isBrand(): boolean {
    return this.formBericht.controls.einsatzart.value === 'Brand';
  }

  get isTechnisch(): boolean {
    return this.formBericht.controls.einsatzart.value === 'Technisch';
  }

  get isTechnischPkw(): boolean {
    return this.isTechnisch && this.formBericht.controls.technischKategorie.value === 'Geschädigter PKW';
  }

  ngOnInit(): void {
    sessionStorage.setItem('PageNumber', '2');
    sessionStorage.setItem('Page2', 'BER');
    this.breadcrumb = this.globalDataService.ladeBreadcrumb();

    this.formBericht.controls.einsatzart.valueChanges.subscribe(() => {
      this.updateConditionalValidation();
    });

    this.formBericht.controls.technischKategorie.valueChanges.subscribe(() => {
      this.updateConditionalValidation();
    });

    this.updateConditionalValidation();

    this.globalDataService.get<any>('einsatzberichte/context').subscribe({
      next: (context: any) => {
        this.fahrzeugOptionen = (context?.fahrzeuge ?? []).map((item: any) => ({
          id: Number(item.pkid),
          label: item.name ?? item.bezeichnung ?? `Fahrzeug ${item.pkid}`,
        }));

        this.mitgliedOptionen = (context?.mitglieder ?? []).map((item: any) => ({
          id: Number(item.pkid),
          label: `${item.stbnr ?? ''} ${item.vorname ?? ''} ${item.nachname ?? ''}`.trim(),
        }));
      },
      error: (error: any) => this.globalDataService.errorAnzeigen(error),
    });

    this.ladeBerichte();
  }

  ladeBerichte(): void {
    this.globalDataService.get<any>('einsatzberichte').subscribe({
      next: (response: any) => {
        const data = Array.isArray(response) ? response : (response?.data ?? response?.results ?? []);
        this.berichte = data as EinsatzberichtDto[];
      },
      error: (error: any) => this.globalDataService.errorAnzeigen(error),
    });
  }

  neuerEntwurf(): void {
    this.viewMode = 'form';
    this.formBericht.reset({
      id: '',
      status: 'ENTWURF',
      einsatzleiter: '',
      einsatzart: '',
      alarmstichwort: '',
      einsatzadresse: '',
      alarmierendeStelle: '',
      einsatzDatum: '',
      ausgerueckt: '',
      eingerueckt: '',
      lageBeimEintreffen: '',
      gesetzteMassnahmen: '',
      brandKategorie: '',
      technischKategorie: '',
      geschaedigterPkw: false,
      fotoDoku: false,
      zulassungsschein: false,
      versicherungsschein: false,
      fahrzeuge: [],
      mitglieder: [],
    });
    this.fotoDateien = [];
    this.fotoFiles = [];
    this.updateConditionalValidation();
  }

  uebernehmeLetztenEinsatz(): void {
    this.neuerEntwurf();
    this.globalDataService.get<any>('einsatzberichte/blaulichtsms/letzter').subscribe({
      next: (response: any) => {
        const mapped = response?.mapped ?? {};
        this.formBericht.patchValue({
          einsatzleiter: mapped.einsatzleiter ?? '',
          einsatzart: mapped.einsatzart ?? '',
          alarmstichwort: mapped.alarmstichwort ?? '',
          einsatzadresse: mapped.einsatzadresse ?? '',
          alarmierendeStelle: mapped.alarmierende_stelle ?? '',
          einsatzDatum: mapped.einsatz_datum ?? '',
          ausgerueckt: mapped.ausgerueckt ?? '',
          eingerueckt: mapped.eingerueckt ?? '',
        });

        this.updateConditionalValidation();
        this.globalDataService.erstelleMessage('success', 'Letzter Alarm von BlaulichtSMS übernommen.');
      },
      error: (error: any) => this.globalDataService.errorAnzeigen(error),
    });
  }

  berichtBearbeiten(bericht: EinsatzberichtDto): void {
    this.viewMode = 'form';
    this.formBericht.patchValue({
      id: bericht.id,
      status: bericht.status || 'ENTWURF',
      einsatzleiter: bericht.einsatzleiter || '',
      einsatzart: bericht.einsatzart || '',
      alarmstichwort: bericht.alarmstichwort || '',
      einsatzadresse: bericht.einsatzadresse || '',
      alarmierendeStelle: bericht.alarmierende_stelle || '',
      einsatzDatum: bericht.einsatz_datum || '',
      ausgerueckt: bericht.ausgerueckt || '',
      eingerueckt: bericht.eingerueckt || '',
      lageBeimEintreffen: bericht.lage_beim_eintreffen || '',
      gesetzteMassnahmen: bericht.gesetzte_massnahmen || '',
      brandKategorie: bericht.brand_kategorie || '',
      technischKategorie: bericht.technisch_kategorie || '',
      geschaedigterPkw: !!bericht.geschaedigter_pkw,
      fotoDoku: !!bericht.foto_doku,
      zulassungsschein: !!bericht.zulassungsschein,
      versicherungsschein: !!bericht.versicherungsschein,
      fahrzeuge: bericht.fahrzeuge || [],
      mitglieder: bericht.mitglieder || [],
    });

    this.fotoFiles = [];
    this.fotoDateien = (bericht.fotos || [])
      .map((f) => f.foto_url || '')
      .filter(Boolean)
      .map((url) => url.split('/').pop() || url);

    this.updateConditionalValidation();
  }

  zurueckZurListe(): void {
    this.viewMode = 'list';
    this.ladeBerichte();
  }

  statusUmschalten(bericht: EinsatzberichtDto): void {
    const neuerStatus = bericht.status === 'ABGESCHLOSSEN' ? 'ENTWURF' : 'ABGESCHLOSSEN';
    this.globalDataService.patch('einsatzberichte', bericht.id, { status: neuerStatus }, false).subscribe({
      next: () => {
        if (this.formBericht.controls.id.value === bericht.id) {
          this.formBericht.controls.status.setValue(neuerStatus);
        }
        this.globalDataService.erstelleMessage('success', `Status auf ${neuerStatus} gesetzt.`);
        this.ladeBerichte();
      },
      error: (error: any) => this.globalDataService.errorAnzeigen(error),
    });
  }

  onFotoDokuSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.fotoFiles = files;
    this.fotoDateien = files.map(file => file.name);
  }

  speichereBericht(): void {
    if (this.formBericht.invalid) {
      this.formBericht.markAllAsTouched();
      this.globalDataService.erstelleMessage('error', 'Bitte alle Pflichtfelder korrekt ausfüllen.');
      return;
    }

    const form = this.formBericht.getRawValue();
    const berichtId = form.id;

    const fd = new FormData();
    fd.append('status', form.status);
    fd.append('einsatzleiter', form.einsatzleiter);
    fd.append('einsatzart', form.einsatzart);
    fd.append('alarmstichwort', form.alarmstichwort);
    fd.append('einsatzadresse', form.einsatzadresse);
    fd.append('alarmierende_stelle', form.alarmierendeStelle);
    fd.append('einsatz_datum', form.einsatzDatum || '');
    fd.append('ausgerueckt', form.ausgerueckt || '');
    fd.append('eingerueckt', form.eingerueckt || '');
    fd.append('lage_beim_eintreffen', form.lageBeimEintreffen);
    fd.append('gesetzte_massnahmen', form.gesetzteMassnahmen);
    fd.append('brand_kategorie', form.brandKategorie || '');
    fd.append('technisch_kategorie', form.technischKategorie || '');
    fd.append('geschaedigter_pkw', String(form.geschaedigterPkw));
    fd.append('foto_doku', String(form.fotoDoku));
    fd.append('zulassungsschein', String(form.zulassungsschein));
    fd.append('versicherungsschein', String(form.versicherungsschein));

    form.fahrzeuge.forEach((fahrzeugId) => fd.append('fahrzeuge', String(fahrzeugId)));
    form.mitglieder.forEach((mitgliedId) => fd.append('mitglieder', String(mitgliedId)));
    this.fotoFiles.forEach((foto) => fd.append('fotos', foto));

    const request$ = berichtId
      ? this.globalDataService.patch('einsatzberichte', berichtId, fd, true)
      : this.globalDataService.post('einsatzberichte', fd, true);

    request$.subscribe({
      next: (saved: any) => {
        this.formBericht.controls.id.setValue(saved?.id ?? berichtId ?? '');
        this.globalDataService.erstelleMessage('success', 'Einsatzbericht gespeichert.');
        this.ladeBerichte();
        this.viewMode = 'list';
      },
      error: (error: any) => this.globalDataService.errorAnzeigen(error),
    });
  }

  private updateConditionalValidation(): void {
    const brandKategorie = this.formBericht.controls.brandKategorie;
    const technischKategorie = this.formBericht.controls.technischKategorie;
    const geschaedigterPkw = this.formBericht.controls.geschaedigterPkw;
    const fotoDoku = this.formBericht.controls.fotoDoku;
    const zulassungsschein = this.formBericht.controls.zulassungsschein;
    const versicherungsschein = this.formBericht.controls.versicherungsschein;

    brandKategorie.clearValidators();
    technischKategorie.clearValidators();
    geschaedigterPkw.clearValidators();
    fotoDoku.clearValidators();
    zulassungsschein.clearValidators();
    versicherungsschein.clearValidators();

    if (this.isBrand) {
      brandKategorie.setValidators([Validators.required]);
      technischKategorie.setValue('');
      geschaedigterPkw.setValue(false);
    }

    if (this.isTechnisch) {
      technischKategorie.setValidators([Validators.required]);
      brandKategorie.setValue('');
    }

    if (this.isTechnischPkw) {
      geschaedigterPkw.setValidators([Validators.requiredTrue]);
      fotoDoku.setValidators([Validators.requiredTrue]);
      zulassungsschein.setValidators([Validators.requiredTrue]);
      versicherungsschein.setValidators([Validators.requiredTrue]);
    } else {
      geschaedigterPkw.setValue(false);
      fotoDoku.setValue(false);
      zulassungsschein.setValue(false);
      versicherungsschein.setValue(false);
      this.fotoDateien = [];
      this.fotoFiles = [];
    }

    brandKategorie.updateValueAndValidity({ emitEvent: false });
    technischKategorie.updateValueAndValidity({ emitEvent: false });
    geschaedigterPkw.updateValueAndValidity({ emitEvent: false });
    fotoDoku.updateValueAndValidity({ emitEvent: false });
    zulassungsschein.updateValueAndValidity({ emitEvent: false });
    versicherungsschein.updateValueAndValidity({ emitEvent: false });
  }
}