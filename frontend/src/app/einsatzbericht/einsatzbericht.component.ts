import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, FormGroupDirective, NgForm, ReactiveFormsModule, Validators } from '@angular/forms';
import { HeaderComponent } from '../_template/header/header.component';
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { DateInputMaskDirective } from '../_directive/date-input-mask.directive';

type FahrzeugOption = {
  id: number;
  label: string;
};

type MitgliedOption = {
  id: number;
  label: string;
};

type MitalarmiertStelleOption = {
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
  brand_aus: string;
  technisch_kategorie: string;
  mitalarmiert: number[];
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
    MatPaginatorModule,
    MatSortModule,
    DateInputMaskDirective,
  ],
  templateUrl: './einsatzbericht.component.html',
  styleUrl: './einsatzbericht.component.sass'
})
export class EinsatzberichtComponent implements OnInit {
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  @ViewChild(MatPaginator) set matPaginator(p: MatPaginator | undefined) {
    if (p) this.dataSource.paginator = p;
  }

  @ViewChild(MatSort) set matSort(s: MatSort | undefined) {
    if (s) this.dataSource.sort = s;
  }

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
  einsatzleiterSuche = new FormControl<string>('', { nonNullable: true, validators: [Validators.required] });

  einsatzleiterErrorMatcher: ErrorStateMatcher = {
    isErrorState: (_control: AbstractControl | null, _form: FormGroupDirective | NgForm | null) =>
      this.formBericht.controls.einsatzleiter.touched && this.formBericht.controls.einsatzleiter.invalid,
  };
  fahrzeugSuche = new FormControl<string>('', { nonNullable: true });
  mitalarmiertSuche = new FormControl<string>('', { nonNullable: true });
  berichte: EinsatzberichtDto[] = [];
  dataSource = new MatTableDataSource<EinsatzberichtDto>([]);
  viewMode: 'list' | 'form' = 'list';
  sichtbareSpalten: string[] = ['einsatz_datum', 'alarmstichwort', 'einsatzadresse', 'status', 'actions'];
  canEditBerichte = false;
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

  mitalarmiertOptionen: MitalarmiertStelleOption[] = [];

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
    brandAus: new FormControl<string>('', { nonNullable: true }),
    technischKategorie: new FormControl<string>('', { nonNullable: true }),
    mitalarmiert: new FormControl<number[]>([], { nonNullable: true }),
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

  get filteredMitalarmiertOptionen(): MitalarmiertStelleOption[] {
    const selected = new Set(this.formBericht.controls.mitalarmiert.value);
    const search = this.mitalarmiertSuche.value.trim().toLowerCase();

    return this.mitalarmiertOptionen.filter((option) => {
      if (selected.has(option.id)) {
        return false;
      }
      if (!search) {
        return true;
      }
      return option.label.toLowerCase().includes(search);
    });
  }

  get selectedMitalarmiertOptionen(): MitalarmiertStelleOption[] {
    const selected = this.formBericht.controls.mitalarmiert.value;
    return this.mitalarmiertOptionen.filter((option) => selected.includes(option.id));
  }

  get brandOptionenMitBeschreibung(): Array<{ titel: string; beschreibung: string }> {
    return this.brandOptionen.map((titel) => ({
      titel,
      beschreibung: this.brandOptionBeschreibungen[titel] || ''
    }));
  }

  get selectedFahrzeugOptionen(): FahrzeugOption[] {
    const selected = this.formBericht.controls.fahrzeuge.value;
    return this.fahrzeugOptionen.filter((fahrzeug) => selected.includes(fahrzeug.id));
  }

  get selectedMitgliedOptionen(): MitgliedOption[] {
    const selected = this.formBericht.controls.mitglieder.value;
    return this.mitgliedOptionen.filter((mitglied) => selected.includes(mitglied.id));
  }

  get mitgliederAuswahlCounter(): number {
    return this.formBericht.controls.mitglieder.value.length;
  }

  get mitgliederAuswahlTriggerText(): string {
    const first = this.selectedMitgliedOptionen[0];
    if (!first) {
      return 'Keine Mitglieder ausgewählt';
    }
    return first.label;
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

    this.apiHttpService.delete(`einsatzberichte/${berichtId}/fotos`, foto.id).subscribe({
      next: () => {
        this.bestehendeFotos = this.bestehendeFotos.filter((entry) => String(entry.id) !== String(foto.id));
        this.uiMessageService.erstelleMessage('success', 'Foto gelöscht.');
      },
      error: (error: any) => this.authSessionService.errorAnzeigen(error),
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
    this.breadcrumb = this.navigationService.ladeBreadcrumb();

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

    this.apiHttpService.get<any>('einsatzberichte/context').subscribe({
      next: (context: any) => {
        this.fahrzeugOptionen = (context?.fahrzeuge ?? []).map((item: any) => ({
          id: Number(item.pkid),
          label: item.name ?? item.bezeichnung ?? `Fahrzeug ${item.pkid}`,
        }));

        this.mitgliedOptionen = (context?.mitglieder ?? []).map((item: any) => ({
          id: Number(item.pkid),
          label: `${item.stbnr ?? ''} ${item.vorname ?? ''} ${item.nachname ?? ''}`.trim(),
        }));

        this.mitalarmiertOptionen = (context?.mitalarmiert_stellen ?? []).map((item: any) => ({
          id: Number(item.pkid),
          label: item.name ?? `Stelle ${item.pkid}`,
        }));
      },
      error: (error: any) => this.authSessionService.errorAnzeigen(error),
    });

    this.apiHttpService.get<any>('users/self').subscribe({
      next: (user: any) => {
        const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];
        const isSuperuser = !!user?.is_superuser;
        this.canEditBerichte = isSuperuser || roles.includes('ADMIN') || roles.includes('BERICHT');
        this.canDeleteBerichte = isSuperuser || roles.includes('ADMIN') || roles.includes('VERWALTUNG');
        this.canManageStatus = isSuperuser || roles.includes('ADMIN') || roles.includes('VERWALTUNG');
        if (this.canManageStatus) {
          this.formBericht.controls.status.enable({ emitEvent: false });
        } else {
          this.formBericht.controls.status.disable({ emitEvent: false });
        }
      },
      error: () => {
        this.canEditBerichte = false;
        this.canDeleteBerichte = false;
        this.canManageStatus = false;
        this.formBericht.controls.status.disable({ emitEvent: false });
      },
    });

    this.ladeBerichte();
  }

  ladeBerichte(): void {
    this.apiHttpService.get<any>('einsatzberichte').subscribe({
      next: (response: any) => {
        const data = Array.isArray(response) ? response : (response?.data ?? response?.results ?? []);
        this.berichte = data as EinsatzberichtDto[];
        this.dataSource.data = this.berichte;
      },
      error: (error: any) => this.authSessionService.errorAnzeigen(error),
    });
  }

  applyFilter(value: string): void {
    this.dataSource.filter = (value || '').trim().toLowerCase();
    this.matPaginator?.firstPage();
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
      brandAus: '',
      technischKategorie: '',
      mitalarmiert: [],
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
    this.apiHttpService.get<any>('einsatzberichte/blaulichtsms/letzter').subscribe({
      next: (response: any) => {
        const mapped = response?.mapped ?? {};

        const alarmtext = String(mapped.alarmstichwort ?? '').trim();
        const parsedAlarm = this.parseBlaulichtAlarmtext(alarmtext);

        const uebernommeneEinsatzart = parsedAlarm.einsatzart || String(mapped.einsatzart ?? '').trim();
        const uebernommenesStichwort = this.sanitizeAlarmstichwort(parsedAlarm.alarmstichwort || alarmtext);
        const uebernommeneAdresse = parsedAlarm.einsatzadresse
          || String(mapped.einsatzadresse ?? '').trim()
          || String(response?.raw?.geolocation?.address ?? '').trim();
        const uebernommeneAlarmierendeStelle = this.resolveAlarmierendeStelle(mapped.alarmierende_stelle);

        // Zusagende Mitglieder extrahieren
        const confirmedMemberIds = Array.isArray(mapped.mitglieder_ids) ? mapped.mitglieder_ids : [];

        this.formBericht.patchValue({
          einsatzart: uebernommeneEinsatzart || 'Sonstiges',
          alarmstichwort: uebernommenesStichwort,
          einsatzadresse: uebernommeneAdresse,
          alarmierendeStelle: uebernommeneAlarmierendeStelle,
          einsatzDatum: this.normalizeDateInput(mapped.einsatz_datum),
          ausgerueckt: mapped.ausgerueckt ?? '',
          mitglieder: confirmedMemberIds,
        });

        this.einsatzleiterSuche.setValue(this.formBericht.controls.einsatzleiter.value);

        this.updateConditionalValidation();
        if (confirmedMemberIds.length > 0) {
          this.uiMessageService.erstelleMessage('success', `Alarm übernommen. ${confirmedMemberIds.length} Mitglied(er) haben zugesagt.`);
        } else {
          this.uiMessageService.erstelleMessage('success', 'Letzter Alarm von BlaulichtSMS übernommen.');
        }
      },
      error: (error: any) => this.authSessionService.errorAnzeigen(error),
    });
  }

  private parseBlaulichtAlarmtext(alarmtext: string): {
    einsatzart: string;
    alarmstichwort: string;
    einsatzadresse: string;
  } {
    let text = this.normalizeAlarmText(alarmtext);
    if (!text) {
      return {
        einsatzart: '',
        alarmstichwort: '',
        einsatzadresse: '',
      };
    }

    // 1. Zeitklammer entfernen: (HH:MM) oder (HH:MM:SS)
    text = text.replace(/\(\d{1,2}:\d{2}(?::\d{2})?\)\s*/g, '').trim();

    // 2. Einsatzart extrahieren
    const einsatzart = this.mapAlarmTextToEinsatzart(text);

    // 3. Stichwort: alles bis zum ersten Punkt
    const firstDotIndex = text.indexOf('.');
    let alarmstichwort = '';
    if (firstDotIndex > -1) {
      alarmstichwort = text.substring(0, firstDotIndex).trim();
    } else {
      alarmstichwort = text.trim();
    }

    // 4. Adresse: vom ersten Punkt bis zum ersten Doppelpunkt (falls vorhanden)
    let einsatzadresse = '';
    if (firstDotIndex > -1) {
      const afterDot = text.substring(firstDotIndex + 1).trim();
      const firstColonIndex = afterDot.indexOf(':');

      if (firstColonIndex > -1) {
        // Adresse bis zum Doppelpunkt
        einsatzadresse = afterDot.substring(0, firstColonIndex).trim();
      } else {
        // Kein Doppelpunkt: nimm alles nach dem Punkt, entferne Klammern + Koordinaten
        einsatzadresse = afterDot.replace(/\([^)]*\)/g, '').trim();
      }
    }

    // 5. Cleanup
    alarmstichwort = this.sanitizeAlarmstichwort(alarmstichwort).trim();
    einsatzadresse = this.removeCoordinates(einsatzadresse).trim();

    return {
      einsatzart,
      alarmstichwort,
      einsatzadresse,
    };
  }

  private normalizeAlarmText(value: string): string {
    return String(value ?? '')
      .replace(/\\r\\n|\\n|\\r/g, '\n')
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter((line) => line !== '')
      .join('\n')
      .trim();
  }

  private resolveAlarmierendeStelle(value: unknown): string {
    const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return 'AAZ / BAZ / LWZ';
    }

    if (/^IP_AG_[A-Z0-9_]+$/i.test(normalized)) {
      return 'AAZ / BAZ / LWZ';
    }

    if (/^(AAZ\s*\/\s*BAZ\s*\/\s*LWZ|AAZ|BAZ|LWZ|LEITSTELLE)$/i.test(normalized)) {
      return 'AAZ / BAZ / LWZ';
    }

    if (/^eigenalarmiert$/i.test(normalized)) {
      return 'Eigenalarmiert';
    }

    if (/^keine\s*alarmiert$/i.test(normalized)) {
      return 'Keine Alarmiert';
    }

    return normalized;
  }

  private sanitizeAlarmstichwort(value: string): string {
    const withoutDateAndTime = String(value ?? '')
      .replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g, ' ')
      .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:uhr)?\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return this.cleanupAlarmSegment(withoutDateAndTime);
  }

  private toAlarmSegments(value: string): string[] {
    const segments: string[] = [];
    String(value ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')
      .forEach((line) => {
        // Split nach ,;|. und ". " (Punkt + Leerzeichen), aber nicht bei Dezimalzahlen wie "km 1.4"
        line
          .split(/[,;|]|\.\s+/)
          .map((part) => part.trim())
          .filter((part) => part !== '')
          .forEach((part) => segments.push(part));
      });

    return segments;
  }

  private extractStichwortAndAdresse(
    segments: string[],
    fallbackText: string,
  ): { alarmstichwort: string; einsatzadresse: string } {
    let alarmstichwort = '';
    const adressSegmente: string[] = [];

    for (const rawSegment of segments) {
      const segment = this.cleanupAlarmSegment(rawSegment);
      if (!segment) {
        continue;
      }

      const labeledAddress = this.extractLabeledAddress(segment);
      if (labeledAddress) {
        if (!alarmstichwort && labeledAddress.alarmstichwort) {
          alarmstichwort = labeledAddress.alarmstichwort;
        }
        if (labeledAddress.einsatzadresse) {
          adressSegmente.push(labeledAddress.einsatzadresse);
        }
        continue;
      }

      const splitResult = this.trySplitSegment(segment);
      if (!alarmstichwort && splitResult.alarmstichwort) {
        alarmstichwort = splitResult.alarmstichwort;
      }
      if (splitResult.einsatzadresse) {
        adressSegmente.push(splitResult.einsatzadresse);
        continue;
      }

      const cleaned = this.cleanupAlarmSegment(this.removeLeadingAlarmToken(segment));
      if (!cleaned) {
        continue;
      }

      // Zuerst checken: ist es eine gültige Adresse (auch wenn Meta-Segment)?
      if (this.looksLikeAddress(cleaned)) {
        adressSegmente.push(cleaned);
        continue;
      }

      // Jetzt Meta-Segment checken (nur NACH Adresse-Check)
      if (this.isAlarmMetaSegment(cleaned)) {
        continue;
      }

      if (!alarmstichwort) {
        alarmstichwort = cleaned;
        continue;
      }

      if (adressSegmente.length > 0) {
        adressSegmente.push(cleaned);
      }
    }

    if (!alarmstichwort) {
      alarmstichwort = this.cleanupAlarmSegment(this.removeLeadingAlarmToken(fallbackText));
    }

    const einsatzadresse = this.uniqueAndJoinSegments(adressSegmente) || this.tryExtractAddressFromText(fallbackText);
    return {
      alarmstichwort,
      einsatzadresse,
    };
  }

  private uniqueAndJoinSegments(segments: string[]): string {
    const uniqueSegments = Array.from(
      new Set(
        segments
          .map((segment) => this.cleanupAlarmSegment(segment))
          .filter((segment) => segment !== ''),
      ),
    );
    return uniqueSegments.join(', ').trim();
  }

  private extractLabeledAddress(segment: string): { alarmstichwort: string; einsatzadresse: string } | null {
    const match = segment.match(/^(.*?)(?:\b(einsatzort|einsatzadresse|adresse|ort|objekt)\b)\s*[:\-]\s*(.+)$/i);
    if (!match) {
      return null;
    }

    return {
      alarmstichwort: this.cleanupAlarmSegment(this.removeLeadingAlarmToken(match[1] ?? '')),
      einsatzadresse: this.cleanupAlarmSegment(match[3] ?? ''),
    };
  }

  private trySplitSegment(segment: string): { alarmstichwort: string; einsatzadresse: string } {
    const cleaned = this.cleanupAlarmSegment(segment);
    if (!cleaned) {
      return {
        alarmstichwort: '',
        einsatzadresse: '',
      };
    }

    const separators = [' - ', ':'];
    for (const separator of separators) {
      const splitIndex = cleaned.indexOf(separator);
      if (splitIndex <= 0 || splitIndex >= cleaned.length - separator.length) {
        continue;
      }

      const left = this.cleanupAlarmSegment(this.removeLeadingAlarmToken(cleaned.slice(0, splitIndex)));
      const right = this.cleanupAlarmSegment(cleaned.slice(splitIndex + separator.length));
      
      const leftIsAddress = left && this.looksLikeAddress(left);
      const rightIsAddress = right && this.looksLikeAddress(right);
      
      // Wenn beide aussehen wie Adresse: nimm left als stichwort + adresse
      if (leftIsAddress && rightIsAddress) {
        return {
          alarmstichwort: left,
          einsatzadresse: left,
        };
      }
      
      // Wenn rechts wie Adresse: right = Adresse, left = Stichwort
      if (rightIsAddress) {
        return {
          alarmstichwort: left || cleaned,
          einsatzadresse: right,
        };
      }
      
      // Wenn links wie Adresse: left = Adresse, right ignorieren (es ist beschreibung der adresse)
      if (leftIsAddress) {
        return {
          alarmstichwort: '',
          einsatzadresse: left,
        };
      }
    }

    return {
      alarmstichwort: this.cleanupAlarmSegment(this.removeLeadingAlarmToken(cleaned)),
      einsatzadresse: '',
    };
  }

  private tryExtractAddressFromText(value: string): string {
    const normalized = this.cleanupAlarmSegment(value);
    if (!normalized) {
      return '';
    }

    const postalCodeMatch = normalized.match(/\b\d{4}\s+[^,;|]{2,}\b/);
    if (postalCodeMatch) {
      return this.cleanupAlarmSegment(postalCodeMatch[0]);
    }

    const streetMatch = normalized.match(/\b[^,;|]{3,}\s(?:strasse|str\.|gasse|weg|platz|allee|ring|kai|hof|zeile)\s+\d+[A-Za-z0-9\/-]*/i);
    if (streetMatch) {
      return this.cleanupAlarmSegment(streetMatch[0]);
    }

    const kilometerMatch = normalized.match(/\b[A-Z]?\d{1,3}\s+km\s*\d+(?:[.,]\d+)?\b/i);
    if (kilometerMatch) {
      return this.cleanupAlarmSegment(kilometerMatch[0]);
    }

    return '';
  }

  private extractAlarmToken(value: string): string {
    const match = String(value ?? '').match(/\b(BSW|[BTS])\s?(\d{1,2})([A-Z]?)\b/i);
    if (!match) {
      return '';
    }

    return `${(match[1] ?? '').toUpperCase()}${match[2] ?? ''}${(match[3] ?? '').toUpperCase()}`;
  }

  private removeLeadingTimeAndToken(value: string, alarmToken: string): string {
    let normalized = String(value ?? '').trim();

    // Zeit in voller Form: YYYY-MM-DD HH:MM(:SS)
    normalized = normalized.replace(/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:uhr)?\s*[-|,:]?\s*/i, '');
    
    // Zeit nur: HH:MM(:SS), auch in Klammern
    normalized = normalized.replace(/^\(\d{1,2}:\d{2}(?::\d{2})?\)\s*[-|,:]?\s*/i, '');
    normalized = normalized.replace(/^\d{1,2}:\d{2}(?::\d{2})?\s*(?:uhr)?\s*[-|,:]?\s*/i, '');

    if (alarmToken) {
      const escapedToken = this.escapeRegex(alarmToken).replace(/([A-Za-z]+)(\d+)/, '$1\\s*$2');
      normalized = normalized.replace(new RegExp(`^${escapedToken}\\b\\s*[-|,:]?\\s*`, 'i'), '');
    }

    normalized = normalized.replace(/^(alarmierung|alarm|meldung)\s*[:\-]\s*/i, '');
    return normalized.trim();
  }

  private escapeRegex(value: string): string {
    return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private cleanupAlarmSegment(value: string): string {
    const withoutUrls = String(value ?? '').replace(/https?:\/\/\S+/gi, ' ');
    const withoutCoords = this.removeCoordinates(withoutUrls);
    return withoutCoords
      .replace(/\s+/g, ' ')
      .replace(/^[,;|:\-]+/, '')
      .replace(/[,;|:\-]+$/, '')
      .replace(/\(\s*\)/g, '') // leere Klammern entfernen
      .trim();
  }

  private removeCoordinates(value: string): string {
    return String(value ?? '')
      .replace(/\b(?:koordinaten?|coords?)\b\s*[:=]?\s*\d{1,2}[.,]\d{3,}\s*[,/ ]\s*\d{1,3}[.,]\d{3,}\b/gi, ' ')
      .replace(/\b\d{1,2}[.,]\d{3,}\s*[,/ ]\s*\d{1,3}[.,]\d{3,}\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isAlarmMetaSegment(value: string): boolean {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      return true;
    }

    if (this.isCoordinateOnlySegment(normalized)) {
      return true;
    }

    if (/^https?:\/\//i.test(normalized)) {
      return true;
    }

    if (/^(alarmzeit|zeit|datum|einsatznr|einsatznummer|objektid|objektnummer|id|alarmierung|blaulichtsms)\b/i.test(normalized)) {
      return true;
    }

    if (/^(?:IP_AG_[A-Z0-9_]+|AAZ\s*\/\s*BAZ\s*\/\s*LWZ|AAZ|BAZ|LWZ|LEITSTELLE)\b/i.test(normalized)) {
      return true;
    }

    if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(normalized)) {
      return true;
    }

    if (/^(?:BSW|[BTS])\s?\d{1,2}[A-Z]?$/i.test(normalized)) {
      return true;
    }

    return false;
  }

  private isCoordinateOnlySegment(value: string): boolean {
    return /^\d{1,2}[.,]\d{3,}\s*[,/ ]\s*\d{1,3}[.,]\d{3,}$/.test(String(value ?? '').trim());
  }

  private removeLeadingAlarmToken(value: string): string {
    const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return '';
    }

    const withoutTime = normalized.replace(/^\d{1,2}:\d{2}(?::\d{2})?\s*(?:uhr)?\s*[-|,:]?\s*/i, '').trim();
    const tokenMatch = withoutTime.match(/^(BSW|[BTS])\s?(\d{1,2})([A-Z]?)\b\s*[-|,:]?\s*/i);
    if (tokenMatch) {
      return withoutTime.slice(tokenMatch[0].length).trim();
    }

    return withoutTime;
  }

  private looksLikeAddress(value: string): boolean {
    const normalized = this.cleanupAlarmSegment(value);
    if (!normalized || this.isCoordinateOnlySegment(normalized)) {
      return false;
    }

    // Keine Beschreibungswoerter (Aktionswoerter am Anfang)
    if (/^(?:auf|an|in|zu|bei|von|durch|unter|ueber|aus|hat|ist|wird|befindet|liegt|gegen)\b/i.test(normalized)) {
      return false;
    }

    // PLZ-Pattern (4 Ziffern)
    if (/\b\d{4}\b/.test(normalized)) {
      return true;
    }

    // Kilometer/L-Strasse (L2004 km 1.4) - hohe Konfidenz
    if (/\b(?:L\d+|km\s*\d)/i.test(normalized)) {
      return true;
    }

    // Strasse mit Hausnummer Pattern ("Weinbergstrasse 21") - hohe Konfidenz
    if (/\b[A-Za-z][A-Za-z.'\- ]+\s+\d{1,4}[A-Za-z0-9\/-]*\b/i.test(normalized)) {
      return true;
    }

    // Strasse-Name allein nur akzeptieren, wenn kombiniert mit Hausnummer oder km
    if (/\b(?:strasse|str\.|gasse|weg|platz|allee|ring|kai|hof|siedlung|zeile)\b/i.test(normalized)) {
      if (/\d{1,4}|km|L\d+/i.test(normalized)) {
        return true;
      }
    }

    return false;
  }

  private mapAlarmTokenToEinsatzart(token: string): string {
    if (!token) {
      return '';
    }

    const normalizedToken = token.replace(/\s+/g, '').toUpperCase();

    if (/^BSW\d*[A-Z]*$/.test(normalizedToken)) {
      return 'Brandsicherheitswache';
    }
    if (/^B\d*[A-Z]*$/.test(normalizedToken)) {
      return 'Brandeinsatz';
    }
    if (/^T\d*[A-Z]*$/.test(normalizedToken)) {
      return 'Technischer Einsatz';
    }
    if (/^S\d*[A-Z]*$/.test(normalizedToken)) {
      return 'Schadstoffeinsatz';
    }

    return '';
  }

  private mapAlarmTextToEinsatzart(alarmtext: string): string {
    const value = String(alarmtext ?? '');
    if (!value) {
      return '';
    }

    if (/\b(?:BSW\s?\d*|brandsicherheitswache)\b/i.test(value)) {
      return 'Brandsicherheitswache';
    }

    if (/\b(?:S\s?\d+|schadstoff|gefahrgut|chemikal|gasaustritt|oelaustritt)\b/i.test(value)) {
      return 'Schadstoffeinsatz';
    }

    if (/\b(?:B\s?\d+|brand|rauch|feuer|bma|brandmeldeanlage)\b/i.test(value)) {
      return 'Brandeinsatz';
    }

    if (/\b(?:T\s?\d+|verkehrsunfall|vku|bergung|sturmschaden|tueroeffnung|tierrettung|anforderung|hilfeleistung|wasserschaden)\b/i.test(value)) {
      return 'Technischer Einsatz';
    }

    return '';
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
      brandAus: bericht.brand_aus || '',
      technischKategorie: bericht.technisch_kategorie || '',
      mitalarmiert: this.resolveMitalarmiertSelectValue(bericht.mitalarmiert),
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
      this.uiMessageService.erstelleMessage('error', 'Nur Verwaltung oder Admin duerfen den Status aendern.');
      return;
    }

    const neuerStatus = bericht.status === 'ABGESCHLOSSEN' ? 'ENTWURF' : 'ABGESCHLOSSEN';
    this.apiHttpService.patch('einsatzberichte', bericht.id, { status: neuerStatus }, false).subscribe({
      next: () => {
        if (this.formBericht.controls.id.value === bericht.id) {
          this.formBericht.controls.status.setValue(neuerStatus);
        }
        this.uiMessageService.erstelleMessage('success', `Status auf ${neuerStatus} gesetzt.`);
        this.ladeBerichte();
      },
      error: (error: any) => this.authSessionService.errorAnzeigen(error),
    });
  }

  berichtLoeschen(bericht: EinsatzberichtDto): void {
    if (!this.canDeleteBerichte) {
      this.uiMessageService.erstelleMessage('error', 'Keine Berechtigung zum Löschen.');
      return;
    }

    const confirmDelete = window.confirm(`Einsatzbericht "${bericht.alarmstichwort || bericht.id}" wirklich löschen?`);
    if (!confirmDelete) {
      return;
    }

    this.apiHttpService.delete('einsatzberichte', bericht.id).subscribe({
      next: () => {
        this.uiMessageService.erstelleMessage('success', 'Einsatzbericht gelöscht.');
        this.ladeBerichte();
      },
      error: (error: any) => this.authSessionService.errorAnzeigen(error),
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

  onMitalarmiertSelected(event: MatAutocompleteSelectedEvent): void {
    const optionId = Number(event.option.value);
    if (!optionId) {
      return;
    }

    const current = this.formBericht.controls.mitalarmiert.value;
    if (!current.includes(optionId)) {
      this.formBericht.controls.mitalarmiert.setValue([...current, optionId]);
    }

    this.mitalarmiertSuche.setValue('');
  }

  removeMitalarmiert(optionId: number): void {
    const next = this.formBericht.controls.mitalarmiert.value.filter((entry) => entry !== optionId);
    this.formBericht.controls.mitalarmiert.setValue(next);
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
    this.mitalarmiertSuche.setValue('');
  }

  speichereBericht(): void {
    if (!this.canEditBerichte) {
      this.uiMessageService.erstelleMessage('error', 'Nur Bericht oder Admin duerfen Inhalte speichern.');
      return;
    }

    if (this.formBericht.invalid) {
      this.formBericht.markAllAsTouched();
      this.uiMessageService.erstelleMessage('error', 'Bitte alle Pflichtfelder korrekt ausfüllen.');
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
    fd.append('brand_aus', this.isBrand ? (form.brandAus || '') : '');
    fd.append('technisch_kategorie', form.technischKategorie || '');
    form.mitalarmiert.forEach((stelleId) => fd.append('mitalarmiert', String(stelleId)));

    form.fahrzeuge.forEach((fahrzeugId) => fd.append('fahrzeuge', String(fahrzeugId)));
    form.mitglieder.forEach((mitgliedId) => fd.append('mitglieder', String(mitgliedId)));
    this.fotoDokuFiles.forEach((foto) => fd.append('fotos_doku', foto));
    this.zulassungFiles.forEach((foto) => fd.append('fotos_zulassung', foto));
    this.versicherungFiles.forEach((foto) => fd.append('fotos_versicherung', foto));

    const request$ = berichtId
      ? this.apiHttpService.patch('einsatzberichte', berichtId, fd, true)
      : this.apiHttpService.post('einsatzberichte', fd, true);

    request$.subscribe({
      next: (saved: any) => {
        this.formBericht.controls.id.setValue(saved?.id ?? berichtId ?? '');
        this.uiMessageService.erstelleMessage('success', 'Einsatzbericht gespeichert.');
        this.ladeBerichte();
        this.viewMode = 'list';
      },
      error: (error: any) => this.authSessionService.errorAnzeigen(error),
    });
  }

  private updateConditionalValidation(): void {
    const brandKategorie = this.formBericht.controls.brandKategorie;
    const brandAus = this.formBericht.controls.brandAus;
    const technischKategorie = this.formBericht.controls.technischKategorie;

    brandKategorie.clearValidators();
    brandAus.clearValidators();
    technischKategorie.clearValidators();

    if (this.isBrand) {
      if (technischKategorie.value) {
        technischKategorie.setValue('', { emitEvent: false });
      }
    } else {
      if (brandKategorie.value) {
        brandKategorie.setValue('', { emitEvent: false });
      }
      if (brandAus.value) {
        brandAus.setValue('', { emitEvent: false });
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

    brandKategorie.updateValueAndValidity({ emitEvent: false });
    brandAus.updateValueAndValidity({ emitEvent: false });
    technischKategorie.updateValueAndValidity({ emitEvent: false });
  }

  private normalizeMitalarmiertValues(value: unknown): number[] {
    if (Array.isArray(value)) {
      return value
        .map((entry) => Number(entry))
        .filter((entry) => Number.isFinite(entry) && entry > 0);
    }
    return [];
  }

  private resolveMitalarmiertSelectValue(value: unknown): number[] {
    return Array.from(new Set(this.normalizeMitalarmiertValues(value)));
  }
}
