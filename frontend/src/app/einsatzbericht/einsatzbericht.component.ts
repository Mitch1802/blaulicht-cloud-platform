import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HeaderComponent } from '../_template/header/header.component';
import { GlobalDataService } from '../_service/global-data.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

type FahrzeugOption = {
  id: number;
  label: string;
};

type MitgliedOption = {
  id: number;
  label: string;
};

type EinsatzberichtFotoDto = {
  id: string | number;
  foto_url?: string;
  dokument_typ?: string;
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
  mitalarmiert: string;
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
    MatExpansionModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatIconModule,
    MatTableModule,
  ],
  templateUrl: './einsatzbericht.component.html',
  styleUrl: './einsatzbericht.component.sass'
})
export class EinsatzberichtComponent implements OnInit {
  private globalDataService = inject(GlobalDataService);

  title = 'Einsatzbericht';
  breadcrumb: any[] = [];

  bestehendeFotos: EinsatzberichtFotoDto[] = [];
  private filePreviewUrlMap = new Map<File, string>();

  fotoDokuDateien: string[] = [];
  fotoDokuFiles: File[] = [];

  zulassungDateien: string[] = [];
  zulassungFiles: File[] = [];

  versicherungDateien: string[] = [];
  versicherungFiles: File[] = [];

  einsatzarten = [
    'Brandeinsatz',
    'Technischer Einsatz',
    'Schadstoffeinsatz',
    'Brandsicherheitswache',
    'Sonstiges'
  ];

  brandOptionen = [
    'Kleinbrand',
    'Mittelbrand',
    'Großbrand',
    'Brand vor Eintreffen gelöscht oder erloschen'
  ];

  brandOptionBeschreibungen: Record<string, string> = {
    'Kleinbrand': 'Kleinlöschgerät, HD/Schnellangriff, 1 STrahlrohr, Kaminbrand',
    'Mittelbrand': '2-3 Strahlrohre im Einsatz',
    'Großbrand': '> 3 Strahrohre im Einsatz',
    'Brand vor Eintreffen gelöscht oder erloschen': '',
  };

  technischOptionen = [
    'Tiere oder Menschen gerettet/befreit',
    'Unfall mit Schadstoffen',
    'Unfall mit Personenschaden',
    'VU - LKW',
    'VU - mehr als 2 beteiligte PKW',
    'VU - mehr als 5 Verletzte oder min. ein Todesopfer'
  ];

  fahrzeugOptionen: FahrzeugOption[] = [];
  mitgliedOptionen: MitgliedOption[] = [];
  einsatzleiterSuche = new FormControl<string>('', { nonNullable: true });
  fahrzeugSuche = new FormControl<string>('', { nonNullable: true });
  mitgliedSuche = new FormControl<string>('', { nonNullable: true });
  berichte: EinsatzberichtDto[] = [];
  viewMode: 'list' | 'form' = 'list';
  sichtbareSpalten: string[] = ['einsatz_datum', 'alarmstichwort', 'einsatzadresse', 'status', 'actions'];
  canDeleteBerichte = false;
  canManageStatus = false;

  statusOptionen = [
    { key: 'ENTWURF', label: 'Entwurf' },
    { key: 'ABGESCHLOSSEN', label: 'Abgeschlossen' },
  ];

  alarmierendeStelleOptionenBasis: string[] = [
    'AAZ / BAZ / LWZ',
    'Eigenalarmiert',
    'Keine Alarmiert',
  ];

  mitalarmiertOptionenBasis: string[] = [
    'Rettungsdienst',
    'Polizei',
    'Gemeinde',
    'EVN / Wiener Netze',
    'Flughafen Wien (FBL)',
    'ÖBB Einsatzleiter',
    'Andere'
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
    mitalarmiert: new FormControl<string>('', { nonNullable: true }),
    mitalarmiertText: new FormControl<string>('', { nonNullable: true }),
    fahrzeuge: new FormControl<number[]>([], { nonNullable: true }),
    mitglieder: new FormControl<number[]>([], { nonNullable: true }),
  });

  get isBrand(): boolean {
    return this.formBericht.controls.einsatzart.value === 'Brandeinsatz';
  }

  get isTechnisch(): boolean {
    return this.formBericht.controls.einsatzart.value === 'Technischer Einsatz';
  }

  get filteredFahrzeugOptionen(): FahrzeugOption[] {
    const selected = new Set(this.formBericht.controls.fahrzeuge.value);
    const search = this.fahrzeugSuche.value.trim().toLowerCase();
    return this.fahrzeugOptionen.filter((fahrzeug) => {
      if (selected.has(fahrzeug.id)) {
        return false;
      }
      if (!search) {
        return true;
      }
      return fahrzeug.label.toLowerCase().includes(search);
    });
  }

  get filteredMitgliedOptionen(): MitgliedOption[] {
    const selected = new Set(this.formBericht.controls.mitglieder.value);
    const search = this.mitgliedSuche.value.trim().toLowerCase();
    return this.mitgliedOptionen.filter((mitglied) => {
      if (selected.has(mitglied.id)) {
        return false;
      }
      if (!search) {
        return true;
      }
      return mitglied.label.toLowerCase().includes(search);
    });
  }

  get einsatzleiterOptionen(): string[] {
    const options = this.mitgliedOptionen.map((mitglied) => mitglied.label);
    const current = this.formBericht.controls.einsatzleiter.value?.trim();
    if (current && !options.includes(current)) {
      options.unshift(current);
    }
    return options;
  }

  get filteredEinsatzleiterOptionen(): string[] {
    const search = this.einsatzleiterSuche.value.trim().toLowerCase();
    if (!search) {
      return this.einsatzleiterOptionen;
    }

    return this.einsatzleiterOptionen.filter((einsatzleiter) => einsatzleiter.toLowerCase().includes(search));
  }

  get alarmierendeStelleOptionen(): string[] {
    const current = this.formBericht.controls.alarmierendeStelle.value?.trim();
    if (current && !this.alarmierendeStelleOptionenBasis.includes(current)) {
      return [current, ...this.alarmierendeStelleOptionenBasis];
    }
    return this.alarmierendeStelleOptionenBasis;
  }

  get mitalarmiertOptionen(): string[] {
    return this.mitalarmiertOptionenBasis;
  }

  get isMitalarmiertAndere(): boolean {
    return this.formBericht.controls.mitalarmiert.value === 'Andere';
  }

  get selectedBrandBeschreibung(): string {
    const key = this.formBericht.controls.brandKategorie.value;
    return this.brandOptionBeschreibungen[key] || '';
  }

  get selectedFahrzeugOptionen(): FahrzeugOption[] {
    const selected = this.formBericht.controls.fahrzeuge.value;
    return this.fahrzeugOptionen.filter((fahrzeug) => selected.includes(fahrzeug.id));
  }

  get selectedMitgliedOptionen(): MitgliedOption[] {
    const selected = this.formBericht.controls.mitglieder.value;
    return this.mitgliedOptionen.filter((mitglied) => selected.includes(mitglied.id));
  }

  get bestehendeDokuFotos(): EinsatzberichtFotoDto[] {
    return this.bestehendeFotos.filter((foto) => (foto.dokument_typ || 'ALLGEMEIN') === 'DOKU');
  }

  get bestehendeZulassungFotos(): EinsatzberichtFotoDto[] {
    return this.bestehendeFotos.filter((foto) => foto.dokument_typ === 'ZULASSUNG');
  }

  get bestehendeVersicherungFotos(): EinsatzberichtFotoDto[] {
    return this.bestehendeFotos.filter((foto) => foto.dokument_typ === 'VERSICHERUNG');
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

  removeSelectedDokument(index: number, dokumentTyp: 'fotoDoku' | 'zulassungsschein' | 'versicherungsschein'): void {
    const confirmDelete = window.confirm('Datei wirklich entfernen?');
    if (!confirmDelete) {
      return;
    }

    if (dokumentTyp === 'fotoDoku') {
      const removed = this.fotoDokuFiles[index];
      if (removed) {
        const url = this.filePreviewUrlMap.get(removed);
        if (url) {
          URL.revokeObjectURL(url);
          this.filePreviewUrlMap.delete(removed);
        }
      }
      this.fotoDokuFiles = this.fotoDokuFiles.filter((_, i) => i !== index);
      this.fotoDokuDateien = this.fotoDokuFiles.map((file) => file.name);
      return;
    }

    if (dokumentTyp === 'zulassungsschein') {
      const removed = this.zulassungFiles[index];
      if (removed) {
        const url = this.filePreviewUrlMap.get(removed);
        if (url) {
          URL.revokeObjectURL(url);
          this.filePreviewUrlMap.delete(removed);
        }
      }
      this.zulassungFiles = this.zulassungFiles.filter((_, i) => i !== index);
      this.zulassungDateien = this.zulassungFiles.map((file) => file.name);
      return;
    }

    const removed = this.versicherungFiles[index];
    if (removed) {
      const url = this.filePreviewUrlMap.get(removed);
      if (url) {
        URL.revokeObjectURL(url);
        this.filePreviewUrlMap.delete(removed);
      }
    }
    this.versicherungFiles = this.versicherungFiles.filter((_, i) => i !== index);
    this.versicherungDateien = this.versicherungFiles.map((file) => file.name);
  }

  loescheBestehendesFoto(foto: EinsatzberichtFotoDto): void {
    const berichtId = this.formBericht.controls.id.value;
    if (!berichtId || !foto?.id) {
      return;
    }

    const fileName = this.getFileNameFromPath(foto.foto_url);
    const confirmDelete = window.confirm(`Foto "${fileName}" wirklich löschen?`);
    if (!confirmDelete) {
      return;
    }

    this.globalDataService.delete(`einsatzberichte/${berichtId}/fotos`, foto.id).subscribe({
      next: () => {
        this.bestehendeFotos = this.bestehendeFotos.filter((entry) => String(entry.id) !== String(foto.id));
        this.globalDataService.erstelleMessage('success', 'Foto gelöscht.');
      },
      error: (error: any) => this.globalDataService.errorAnzeigen(error),
    });
  }

  formatListDateTime(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }

    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    const hour = String(parsed.getHours()).padStart(2, '0');
    const minute = String(parsed.getMinutes()).padStart(2, '0');

    return `${day}.${month}.${year} ${hour}:${minute}`;
  }

  private normalizeDateInput(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const stringValue = String(value).trim();
    if (!stringValue) {
      return '';
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
      return stringValue;
    }

    if (/^\d{2}\.\d{2}\.\d{4}$/.test(stringValue)) {
      const [day, month, year] = stringValue.split('.');
      return `${year}-${month}-${day}`;
    }

    if (stringValue.includes('T')) {
      const isoDate = stringValue.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        return isoDate;
      }
    }

    const parsed = new Date(stringValue);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }

    return '';
  }

  private formatDateForApi(value: string | null | undefined): string {
    return this.normalizeDateInput(value);
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

    this.formBericht.controls.mitalarmiert.valueChanges.subscribe(() => {
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

    this.globalDataService.get<any>('users/self').subscribe({
      next: (user: any) => {
        const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];
        const isSuperuser = !!user?.is_superuser;
        this.canDeleteBerichte = isSuperuser || roles.includes('ADMIN') || roles.includes('VERWALTUNG');
        this.canManageStatus = isSuperuser || roles.includes('ADMIN') || roles.includes('VERWALTUNG');
        if (this.canManageStatus) {
          this.formBericht.controls.status.enable({ emitEvent: false });
        } else {
          this.formBericht.controls.status.disable({ emitEvent: false });
        }
      },
      error: () => {
        this.canDeleteBerichte = false;
        this.canManageStatus = false;
        this.formBericht.controls.status.disable({ emitEvent: false });
      },
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
      mitalarmiert: '',
      mitalarmiertText: '',
      fahrzeuge: [],
      mitglieder: [],
    });
    this.bestehendeFotos = [];
    this.resetSuchfilter();
    this.resetDokumentUploads();
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
          einsatzDatum: this.normalizeDateInput(mapped.einsatz_datum),
          ausgerueckt: mapped.ausgerueckt ?? '',
          eingerueckt: mapped.eingerueckt ?? '',
        });

        this.einsatzleiterSuche.setValue(this.formBericht.controls.einsatzleiter.value);

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
      einsatzDatum: this.normalizeDateInput(bericht.einsatz_datum),
      ausgerueckt: bericht.ausgerueckt || '',
      eingerueckt: bericht.eingerueckt || '',
      lageBeimEintreffen: bericht.lage_beim_eintreffen || '',
      gesetzteMassnahmen: bericht.gesetzte_massnahmen || '',
      brandKategorie: bericht.brand_kategorie || '',
      technischKategorie: bericht.technisch_kategorie || '',
      mitalarmiert: this.resolveMitalarmiertSelectValue(bericht.mitalarmiert || ''),
      mitalarmiertText: this.resolveMitalarmiertTextValue(bericht.mitalarmiert || ''),
      fahrzeuge: bericht.fahrzeuge || [],
      mitglieder: bericht.mitglieder || [],
    });

    this.bestehendeFotos = (bericht.fotos || []);
    this.einsatzleiterSuche.setValue(this.formBericht.controls.einsatzleiter.value);
    this.resetSuchfilter();
    this.resetDokumentUploads();

    this.updateConditionalValidation();
  }

  zurueckZurListe(): void {
    this.viewMode = 'list';
    this.ladeBerichte();
  }

  statusUmschalten(bericht: EinsatzberichtDto): void {
    if (!this.canManageStatus) {
      this.globalDataService.erstelleMessage('error', 'Nur Verwaltung oder Admin dürfen den Status ändern.');
      return;
    }

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

  berichtLoeschen(bericht: EinsatzberichtDto): void {
    if (!this.canDeleteBerichte) {
      this.globalDataService.erstelleMessage('error', 'Keine Berechtigung zum Löschen.');
      return;
    }

    const confirmDelete = window.confirm(`Einsatzbericht "${bericht.alarmstichwort || bericht.id}" wirklich löschen?`);
    if (!confirmDelete) {
      return;
    }

    this.globalDataService.delete('einsatzberichte', bericht.id).subscribe({
      next: () => {
        this.globalDataService.erstelleMessage('success', 'Einsatzbericht gelöscht.');
        this.ladeBerichte();
      },
      error: (error: any) => this.globalDataService.errorAnzeigen(error),
    });
  }

  onDokumentSelected(event: Event, dokumentTyp: 'fotoDoku' | 'zulassungsschein' | 'versicherungsschein'): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    const fileNames = files.map((file) => file.name);

    if (dokumentTyp === 'fotoDoku') {
      this.fotoDokuFiles = files;
      this.fotoDokuDateien = fileNames;
      return;
    }

    if (dokumentTyp === 'zulassungsschein') {
      this.zulassungFiles = files;
      this.zulassungDateien = fileNames;
      return;
    }

    this.versicherungFiles = files;
    this.versicherungDateien = fileNames;
  }

  onEinsatzleiterSelected(event: MatAutocompleteSelectedEvent): void {
    const value = String(event.option.value || '').trim();
    this.formBericht.controls.einsatzleiter.setValue(value);
    this.einsatzleiterSuche.setValue(value);
  }

  onFahrzeugSelected(event: MatAutocompleteSelectedEvent): void {
    const id = Number(event.option.value);
    const current = this.formBericht.controls.fahrzeuge.value;
    if (!current.includes(id)) {
      this.formBericht.controls.fahrzeuge.setValue([...current, id]);
    }
    this.fahrzeugSuche.setValue('');
  }

  removeFahrzeug(id: number): void {
    const next = this.formBericht.controls.fahrzeuge.value.filter((x) => x !== id);
    this.formBericht.controls.fahrzeuge.setValue(next);
  }

  onMitgliedSelected(event: MatAutocompleteSelectedEvent): void {
    const id = Number(event.option.value);
    const current = this.formBericht.controls.mitglieder.value;
    if (!current.includes(id)) {
      this.formBericht.controls.mitglieder.setValue([...current, id]);
    }
    this.mitgliedSuche.setValue('');
  }

  removeMitglied(id: number): void {
    const next = this.formBericht.controls.mitglieder.value.filter((x) => x !== id);
    this.formBericht.controls.mitglieder.setValue(next);
  }

  private resetDokumentUploads(): void {
    this.filePreviewUrlMap.forEach((url) => URL.revokeObjectURL(url));
    this.filePreviewUrlMap.clear();

    this.fotoDokuDateien = [];
    this.fotoDokuFiles = [];
    this.zulassungDateien = [];
    this.zulassungFiles = [];
    this.versicherungDateien = [];
    this.versicherungFiles = [];
  }

  private resetSuchfilter(): void {
    if (!this.formBericht.controls.einsatzleiter.value) {
      this.einsatzleiterSuche.setValue('');
    }
    this.fahrzeugSuche.setValue('');
    this.mitgliedSuche.setValue('');
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
    fd.append('einsatz_datum', this.formatDateForApi(form.einsatzDatum));
    fd.append('ausgerueckt', form.ausgerueckt || '');
    fd.append('eingerueckt', form.eingerueckt || '');
    fd.append('lage_beim_eintreffen', form.lageBeimEintreffen);
    fd.append('gesetzte_massnahmen', form.gesetzteMassnahmen);
    fd.append('brand_kategorie', this.isBrand ? (form.brandKategorie || '') : '');
    fd.append('technisch_kategorie', form.technischKategorie || '');
    const mitalarmiertValue = form.mitalarmiert === 'Andere'
      ? (form.mitalarmiertText || '').trim()
      : (form.mitalarmiert || '');
    fd.append('mitalarmiert', mitalarmiertValue);

    form.fahrzeuge.forEach((fahrzeugId) => fd.append('fahrzeuge', String(fahrzeugId)));
    form.mitglieder.forEach((mitgliedId) => fd.append('mitglieder', String(mitgliedId)));
    this.fotoDokuFiles.forEach((foto) => fd.append('fotos_doku', foto));
    this.zulassungFiles.forEach((foto) => fd.append('fotos_zulassung', foto));
    this.versicherungFiles.forEach((foto) => fd.append('fotos_versicherung', foto));

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
    const mitalarmiertText = this.formBericht.controls.mitalarmiertText;

    brandKategorie.clearValidators();
    technischKategorie.clearValidators();
    mitalarmiertText.clearValidators();

    if (this.isBrand) {
      if (technischKategorie.value) {
        technischKategorie.setValue('', { emitEvent: false });
      }
    } else {
      if (brandKategorie.value) {
        brandKategorie.setValue('', { emitEvent: false });
      }
    }

    if (this.isTechnisch) {
      if (brandKategorie.value) {
        brandKategorie.setValue('', { emitEvent: false });
      }
    } else {
      if (technischKategorie.value) {
        technischKategorie.setValue('', { emitEvent: false });
      }
    }

    if (this.isMitalarmiertAndere) {
      mitalarmiertText.setValidators([Validators.required]);
    } else {
      if (mitalarmiertText.value) {
        mitalarmiertText.setValue('', { emitEvent: false });
      }
    }

    brandKategorie.updateValueAndValidity({ emitEvent: false });
    technischKategorie.updateValueAndValidity({ emitEvent: false });
    mitalarmiertText.updateValueAndValidity({ emitEvent: false });
  }

  private resolveMitalarmiertSelectValue(value: string): string {
    const trimmed = String(value || '').trim();
    if (!trimmed) {
      return '';
    }
    if (this.mitalarmiertOptionenBasis.includes(trimmed)) {
      return trimmed;
    }
    return 'Andere';
  }

  private resolveMitalarmiertTextValue(value: string): string {
    const trimmed = String(value || '').trim();
    if (!trimmed) {
      return '';
    }
    if (this.mitalarmiertOptionenBasis.includes(trimmed)) {
      return '';
    }
    return trimmed;
  }
}