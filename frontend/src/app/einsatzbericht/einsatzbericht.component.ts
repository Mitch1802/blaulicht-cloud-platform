import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, FormGroupDirective, NgForm, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ImrBreadcrumbItem,
  // ImrCardComponent,
  ImrHeaderComponent,
  ImrPageLayoutComponent,
  ImrSectionComponent,
} from '../imr-ui-library';
import { ImrUploadFieldComponent } from '../imr-ui-library/imr-upload-field/imr-upload-field.component';
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatExpansionModule } from '@angular/material/expansion';
import { DateInputMaskDirective } from '../_directive/date-input-mask.directive';
import { normalizeDateInput } from '../_utils/date-normalization.util';

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
  bma_meldergruppe: string;
  bma_melder: string;
  bma_fehl_tauschungsalarm: string;
  mitalarmiert: number[];
  fahrzeuge: number[];
  mitglieder: number[];
  blaulichtsms_einsatz_id: string;
  fotos?: EinsatzberichtFotoDto[];
  created_at?: string;
};

type EinsatzberichteContextItem = {
  pkid?: number | string;
  name?: string;
  bezeichnung?: string;
  stbnr?: string;
  vorname?: string;
  nachname?: string;
};

type EinsatzberichteContextResponse = {
  fahrzeuge?: EinsatzberichteContextItem[];
  mitglieder?: EinsatzberichteContextItem[];
  mitalarmiert_stellen?: EinsatzberichteContextItem[];
  modul_konfig?: Array<{ modul?: string; konfiguration?: Record<string, unknown> }>;
  konfig?: Array<Record<string, unknown>>;
};

type UserSelfResponse = {
  roles?: string[];
  is_superuser?: boolean;
};

type EinsatzberichteListResponse = EinsatzberichtDto[] | { data?: EinsatzberichtDto[]; results?: EinsatzberichtDto[] };

type BlaulichtsmsResponse = {
  mapped?: {
    alarmstichwort?: string;
    einsatzart?: string;
    einsatzadresse?: string;
    alarmierende_stelle?: unknown;
    mitglieder_ids?: number[];
    einsatz_datum?: string;
    ausgerueckt?: string;
  };
  raw?: {
    geolocation?: {
      address?: string;
    };
  };
};

type SaveEinsatzberichtResponse = {
  id?: string;
};

@Component({
  standalone: true,
  selector: 'app-einsatzbericht',
  imports: [
    ReactiveFormsModule,
    // ImrCardComponent,
    ImrHeaderComponent,
    ImrPageLayoutComponent,
    ImrSectionComponent,
    ImrUploadFieldComponent,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatTableModule,
    MatSortModule,
    MatExpansionModule,
    DateInputMaskDirective,
  ],
  templateUrl: './einsatzbericht.component.html',
  styleUrl: './einsatzbericht.component.sass'
})
export class EinsatzberichtComponent implements OnInit {
  private readonly BMA_FEHL_TAEUSCHUNGSALARM_NONE = '__NONE__';

  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  private destroyRef = inject(DestroyRef);
  @ViewChild(MatPaginator) set matPaginator(p: MatPaginator | undefined) {
    if (p) this.dataSource.paginator = p;
  }

  @ViewChild(MatSort) set matSort(s: MatSort | undefined) {
    if (s) this.dataSource.sort = s;
  }

  title = 'Einsatzbericht';
  breadcrumb: ImrBreadcrumbItem[] = [];

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
  canPrintBericht = false;

  private stammdaten: Record<string, unknown> = {};
  private pdf_konfig: Record<string, unknown> = {};

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
    bmaMeldergruppe: new FormControl<string>('', { nonNullable: true }),
    bmaMelder: new FormControl<string>('', { nonNullable: true }),
    bmaFehlTauschungsalarm: new FormControl<string>(this.BMA_FEHL_TAEUSCHUNGSALARM_NONE, { nonNullable: true }),
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

  get section1HasError(): boolean {
    const c = this.formBericht.controls;
    return [c.einsatzleiter, c.einsatzart, c.alarmstichwort, c.einsatzadresse, c.alarmierendeStelle, c.einsatzDatum, c.ausgerueckt, c.eingerueckt]
      .some((ctrl) => ctrl.invalid && ctrl.touched);
  }

  get section2HasError(): boolean {
    const c = this.formBericht.controls;
    return [c.lageBeimEintreffen, c.gesetzteMassnahmen]
      .some((ctrl) => ctrl.invalid && ctrl.touched);
  }

  get isBMA(): boolean {
    return /\bgefahrenmeldeanlage\b/i.test(this.formBericht.controls.alarmstichwort.value);
  }

  bmaFehlTauschungsalarmOptionen = [
    { value: this.BMA_FEHL_TAEUSCHUNGSALARM_NONE, label: 'Kein Fehl-/Täuschungsalarm' },
    { value: 'Fehlalarm', label: 'Fehlalarm' },
    { value: 'Täuschungsalarm', label: 'Täuschungsalarm' },
  ];

  get sortedFahrzeugOptionen(): FahrzeugOption[] {
    const selectedIds = this.formBericht.controls.fahrzeuge.value;
    const idToFahrzeug = new Map(this.fahrzeugOptionen.map((f) => [f.id, f]));

    // Ausgewählte Fahrzeuge in der Reihenfolge des selectedIds arrays
    const selectedVehicles = selectedIds
      .map((id) => idToFahrzeug.get(id))
      .filter((f): f is FahrzeugOption => f !== undefined);

    // Nicht ausgewählte Fahrzeuge
    const selectedSet = new Set(selectedIds);
    const unselectedVehicles = this.fahrzeugOptionen.filter((f) => !selectedSet.has(f.id));

    return [...selectedVehicles, ...unselectedVehicles];
  }

  get filteredFahrzeugOptionen(): FahrzeugOption[] {
    const search = this.fahrzeugSuche.value.trim().toLowerCase();
    const selectedIds = this.formBericht.controls.fahrzeuge.value;
    const selectedSet = new Set(selectedIds);
    return this.fahrzeugOptionen
      .filter((fahrzeug) => !selectedSet.has(fahrzeug.id))
      .filter((fahrzeug) => {
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

  get sortedMitalarmiertOptionen(): MitalarmiertStelleOption[] {
    const selectedIds = this.formBericht.controls.mitalarmiert.value;
    const idToOption = new Map(this.mitalarmiertOptionen.map((o) => [o.id, o]));

    // Ausgewählte Stellen in der Reihenfolge des selectedIds arrays
    const selectedOptions = selectedIds
      .map((id) => idToOption.get(id))
      .filter((o): o is MitalarmiertStelleOption => o !== undefined);

    // Nicht ausgewählte Stellen
    const selectedSet = new Set(selectedIds);
    const unselectedOptions = this.mitalarmiertOptionen.filter((o) => !selectedSet.has(o.id));

    return [...selectedOptions, ...unselectedOptions];
  }

  get filteredMitalarmiertOptionen(): MitalarmiertStelleOption[] {
    const search = this.mitalarmiertSuche.value.trim().toLowerCase();
    const selectedIds = this.formBericht.controls.mitalarmiert.value;
    const idToOption = new Map(this.mitalarmiertOptionen.map((o) => [o.id, o]));

    // Ausgewählte Stellen in der Reihenfolge des selectedIds arrays
    const selectedOptions = selectedIds
      .map((id) => idToOption.get(id))
      .filter((o): o is MitalarmiertStelleOption => o !== undefined)
      .filter((option) => {
        if (!search) {
          return true;
        }
        return option.label.toLowerCase().includes(search);
      });

    // Nicht ausgewählte Stellen
    const selectedSet = new Set(selectedIds);
    const unselectedOptions = this.mitalarmiertOptionen
      .filter((option) => !selectedSet.has(option.id))
      .filter((option) => {
        if (!search) {
          return true;
        }
        return option.label.toLowerCase().includes(search);
      });

    return [...selectedOptions, ...unselectedOptions];
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

  get sortedMitgliedOptionen(): MitgliedOption[] {
    const selectedIds = this.formBericht.controls.mitglieder.value;
    const idToMitglied = new Map(this.mitgliedOptionen.map((m) => [m.id, m]));

    // Ausgewählte Mitglieder in der Reihenfolge des selectedIds arrays
    const selectedMembers = selectedIds
      .map((id) => idToMitglied.get(id))
      .filter((m): m is MitgliedOption => m !== undefined);

    // Nicht ausgewählte Mitglieder
    const selectedSet = new Set(selectedIds);
    const unselectedMembers = this.mitgliedOptionen.filter((m) => !selectedSet.has(m.id));

    return [...selectedMembers, ...unselectedMembers];
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
      error: (error: unknown) => this.authSessionService.errorAnzeigen(error),
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
    return normalizeDateInput(value);
  }

  private formatDateForApi(value: string | null | undefined): string {
    return normalizeDateInput(value);
  }

  ngOnInit(): void {
    sessionStorage.setItem('PageNumber', '2');
    sessionStorage.setItem('Page2', 'BER');
    this.breadcrumb = this.navigationService.ladeBreadcrumb();

    this.formBericht.controls.einsatzart.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateConditionalValidation();
      });

    this.formBericht.controls.alarmstichwort.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateConditionalValidation();
      });

    this.formBericht.controls.technischKategorie.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateConditionalValidation();
      });

    this.formBericht.controls.mitalarmiert.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateConditionalValidation();
      });

    this.updateConditionalValidation();

    this.apiHttpService.get<EinsatzberichteContextResponse>('einsatzberichte/context').subscribe({
      next: (context) => {
        this.fahrzeugOptionen = (context?.fahrzeuge ?? []).map((item) => ({
          id: Number(item.pkid),
          label: item.name ?? item.bezeichnung ?? `Fahrzeug ${item.pkid}`,
        }));

        this.mitgliedOptionen = (context?.mitglieder ?? []).map((item) => ({
          id: Number(item.pkid),
          label: `${item.stbnr ?? ''} ${item.vorname ?? ''} ${item.nachname ?? ''}`.trim(),
        }));

        this.mitalarmiertOptionen = (context?.mitalarmiert_stellen ?? []).map((item) => ({
          id: Number(item.pkid),
          label: item.name ?? `Stelle ${item.pkid}`,
        }));

        const pdfKonfig = (context?.modul_konfig ?? []).find((m) => m.modul === 'pdf');
        this.pdf_konfig = pdfKonfig?.konfiguration ?? {};
        this.stammdaten = context?.konfig?.[0] ?? {};
      },
      error: (error: unknown) => this.authSessionService.errorAnzeigen(error),
    });

    this.apiHttpService.get<UserSelfResponse>('users/self').subscribe({
      next: (user) => {
        const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];
        const isSuperuser = !!user?.is_superuser;
        this.canEditBerichte = isSuperuser || roles.includes('ADMIN') || roles.includes('BERICHT');
        this.canDeleteBerichte = isSuperuser || roles.includes('ADMIN') || roles.includes('VERWALTUNG');
        this.canManageStatus = isSuperuser || roles.includes('ADMIN') || roles.includes('VERWALTUNG');
        this.canPrintBericht = isSuperuser || roles.includes('ADMIN') || roles.includes('VERWALTUNG');
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
    this.apiHttpService.get<EinsatzberichteListResponse>('einsatzberichte').subscribe({
      next: (response) => {
        const data = Array.isArray(response) ? response : (response?.data ?? response?.results ?? []);
        this.berichte = data as EinsatzberichtDto[];
        this.dataSource.data = this.berichte;
      },
      error: (error: unknown) => this.authSessionService.errorAnzeigen(error),
    });
  }

  applyFilter(value: string): void {
    this.dataSource.filter = (value || '').trim().toLowerCase();
    this.matPaginator?.firstPage();
  }

  get visibleBerichte(): EinsatzberichtDto[] {
    return this.dataSource.filteredData;
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
      bmaMeldergruppe: '',
      bmaMelder: '',
      bmaFehlTauschungsalarm: this.BMA_FEHL_TAEUSCHUNGSALARM_NONE,
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
    this.apiHttpService.get<BlaulichtsmsResponse>('einsatzberichte/blaulichtsms/letzter').subscribe({
      next: (response) => {
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
          lageBeimEintreffen: parsedAlarm.lageBeimEintreffen,
          bmaMeldergruppe: parsedAlarm.bmaMeldergruppe,
          bmaMelder: parsedAlarm.bmaMelder,
        });

        this.einsatzleiterSuche.setValue(this.formBericht.controls.einsatzleiter.value);

        this.updateConditionalValidation();
        if (confirmedMemberIds.length > 0) {
          this.uiMessageService.erstelleMessage('success', `Alarm übernommen. ${confirmedMemberIds.length} Mitglied(er) haben zugesagt.`);
        } else {
          this.uiMessageService.erstelleMessage('success', 'Letzter Alarm von BlaulichtSMS übernommen.');
        }
      },
      error: (error: unknown) => this.authSessionService.errorAnzeigen(error),
    });
  }

  private parseBlaulichtAlarmtext(alarmtext: string): {
    einsatzart: string;
    alarmstichwort: string;
    einsatzadresse: string;
    lageBeimEintreffen: string;
    bmaMeldergruppe: string;
    bmaMelder: string;
  } {
    let text = this.normalizeAlarmText(alarmtext);
    if (!text) {
      return {
        einsatzart: '',
        alarmstichwort: '',
        einsatzadresse: '',
        lageBeimEintreffen: '',
        bmaMeldergruppe: '',
        bmaMelder: '',
      };
    }

    // 1. Zeitklammer entfernen: (HH:MM) oder (HH:MM:SS)
    text = text.replace(/\(\d{1,2}:\d{2}(?::\d{2})?\)\s*/g, '').trim();

    // 2. Stichwort: alles bis zum ersten Punkt
    const firstDotIndex = text.indexOf('.');
    let alarmstichwort = '';
    if (firstDotIndex > -1) {
      alarmstichwort = text.substring(0, firstDotIndex).trim();
    } else {
      alarmstichwort = text.trim();
    }

    // 4. Adresse: vom ersten Punkt bis zum ersten Doppelpunkt (falls vorhanden)
    let einsatzadresse = '';
    let lageBeimEintreffen = '';
    if (firstDotIndex > -1) {
      const afterDot = text.substring(firstDotIndex + 1).trim();
      const hasBMA = /\[BMA:/i.test(afterDot);
      const firstColonIndex = afterDot.indexOf(':');

      if (firstColonIndex > -1) {
        // Adresse bis zum Doppelpunkt
        einsatzadresse = afterDot.substring(0, firstColonIndex).trim();
        // Text nach dem Doppelpunkt → Lage beim Eintreffen (außer bei BMA-Meldungen)
        if (!hasBMA) {
          lageBeimEintreffen = afterDot.substring(firstColonIndex + 1).trim();
        }
      } else {
        // Kein Doppelpunkt: nimm alles nach dem Punkt, entferne Klammern + Koordinaten
        einsatzadresse = afterDot.replace(/\([^)]*\)/g, '').trim();
      }
    }

    // 5. BMA-Daten: [BMA: Meldergruppe-Melder] extrahieren
    let bmaMeldergruppe = '';
    let bmaMelder = '';
    const bmaMatch = text.match(/\[BMA:\s*([^-\]]+?)\s*-\s*([^\]]+)\]/i);
    if (bmaMatch) {
      bmaMeldergruppe = bmaMatch[1].trim();
      bmaMelder = bmaMatch[2].trim();
    }

    // 5. Cleanup
    alarmstichwort = this.sanitizeAlarmstichwort(alarmstichwort).trim();
    einsatzadresse = this.removeCoordinates(einsatzadresse).trim();
    lageBeimEintreffen = this.removeCoordinates(lageBeimEintreffen).replace(/\(\s*\)/g, '').replace(/\s+/g, ' ').trim();

    // 6. Einsatzart nur aus dem finalen Alarmstichwort bestimmen
    const einsatzart = this.mapAlarmTextToEinsatzart(alarmstichwort);

    return {
      einsatzart,
      alarmstichwort,
      einsatzadresse,
      lageBeimEintreffen,
      bmaMeldergruppe,
      bmaMelder,
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
    const match = segment.match(/^(.*?)(?:\b(einsatzort|einsatzadresse|adresse|ort|objekt)\b)\s*[:-]\s*(.+)$/i);
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

    const streetMatch = normalized.match(/\b[^,;|]{3,}\s(?:strasse|str\.|gasse|weg|platz|allee|ring|kai|hof|zeile)\s+\d+[A-Za-z0-9/-]*/i);
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

    normalized = normalized.replace(/^(alarmierung|alarm|meldung)\s*[:-]\s*/i, '');
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
      .replace(/^[,;|:-]+/, '')
      .replace(/[,;|:-]+$/, '')
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
    if (/\b[A-Za-z][A-Za-z.'\- ]+\s+\d{1,4}[A-Za-z0-9/-]*\b/i.test(normalized)) {
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
      bmaMeldergruppe: bericht.bma_meldergruppe || '',
      bmaMelder: bericht.bma_melder || '',
      bmaFehlTauschungsalarm: this.toBmaFehlTaeuschungsalarmSelectValue(bericht.bma_fehl_tauschungsalarm),
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
      error: (error: unknown) => this.authSessionService.errorAnzeigen(error),
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
      error: (error: unknown) => this.authSessionService.errorAnzeigen(error),
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
    fd.append('bma_meldergruppe', this.isBMA ? (form.bmaMeldergruppe || '') : '');
    fd.append('bma_melder', this.isBMA ? (form.bmaMelder || '') : '');
    fd.append('bma_fehl_tauschungsalarm', this.isBMA ? this.toBmaFehlTaeuschungsalarmApiValue(form.bmaFehlTauschungsalarm) : '');
    form.mitalarmiert.forEach((stelleId) => fd.append('mitalarmiert', String(stelleId)));

    form.fahrzeuge.forEach((fahrzeugId) => fd.append('fahrzeuge', String(fahrzeugId)));
    form.mitglieder.forEach((mitgliedId) => fd.append('mitglieder', String(mitgliedId)));
    this.fotoDokuFiles.forEach((foto) => fd.append('fotos_doku', foto));
    this.zulassungFiles.forEach((foto) => fd.append('fotos_zulassung', foto));
    this.versicherungFiles.forEach((foto) => fd.append('fotos_versicherung', foto));

    const request$ = berichtId
      ? this.apiHttpService.patch<SaveEinsatzberichtResponse>('einsatzberichte', berichtId, fd, true)
      : this.apiHttpService.post<SaveEinsatzberichtResponse>('einsatzberichte', fd, true);

    request$.subscribe({
      next: (saved) => {
        this.formBericht.controls.id.setValue(saved?.id ?? berichtId ?? '');
        this.uiMessageService.erstelleMessage('success', 'Einsatzbericht gespeichert.');
        this.ladeBerichte();
        this.viewMode = 'list';
      },
      error: (error: unknown) => this.authSessionService.errorAnzeigen(error),
    });
  }

  private updateConditionalValidation(): void {
    const brandKategorie = this.formBericht.controls.brandKategorie;
    const brandAus = this.formBericht.controls.brandAus;
    const technischKategorie = this.formBericht.controls.technischKategorie;
    const bmaMeldergruppe = this.formBericht.controls.bmaMeldergruppe;
    const bmaMelder = this.formBericht.controls.bmaMelder;
    const bmaFehlTauschungsalarm = this.formBericht.controls.bmaFehlTauschungsalarm;

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

    if (!this.isBMA) {
      if (bmaMeldergruppe.value) {
        bmaMeldergruppe.setValue('', { emitEvent: false });
      }
      if (bmaMelder.value) {
        bmaMelder.setValue('', { emitEvent: false });
      }
      if (bmaFehlTauschungsalarm.value !== this.BMA_FEHL_TAEUSCHUNGSALARM_NONE) {
        bmaFehlTauschungsalarm.setValue(this.BMA_FEHL_TAEUSCHUNGSALARM_NONE, { emitEvent: false });
      }
    } else if (!bmaFehlTauschungsalarm.value) {
      bmaFehlTauschungsalarm.setValue(this.BMA_FEHL_TAEUSCHUNGSALARM_NONE, { emitEvent: false });
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

  private toBmaFehlTaeuschungsalarmSelectValue(value: string | null | undefined): string {
    const normalized = String(value ?? '').trim();
    return normalized || this.BMA_FEHL_TAEUSCHUNGSALARM_NONE;
  }

  private toBmaFehlTaeuschungsalarmApiValue(value: string | null | undefined): string {
    const normalized = String(value ?? '').trim();
    if (!normalized || normalized === this.BMA_FEHL_TAEUSCHUNGSALARM_NONE) {
      return '';
    }
    return normalized;
  }

  private resolveMitalarmiertSelectValue(value: unknown): number[] {
    return Array.from(new Set(this.normalizeMitalarmiertValues(value)));
  }

  druckeBericht(element: EinsatzberichtDto): void {
    if (!this.canPrintBericht) {
      this.uiMessageService.erstelleMessage('error', 'Druck ist nur für Rollen ADMIN und VERWALTUNG verfügbar.');
      return;
    }

    const templateId = String(this.pdf_konfig['idEinsatzberichtPdf'] ?? '');
    if (!templateId) {
      this.uiMessageService.erstelleMessage('error', 'Kein PDF-Template konfiguriert. Bitte unter modul_konfiguration den Schlüssel "idEinsatzberichtPdf" eintragen.');
      return;
    }

    const abfrageUrl = `pdf/templates/${templateId}/render`;
    let heute = new Date().toLocaleString('de-DE').split(',')[0];

    const fahrzeugNamen = (element.fahrzeuge ?? [])
      .map((id) => this.fahrzeugOptionen.find((f) => f.id === id)?.label ?? String(id))
      .join(', ');

    const mitgliederNamen = (element.mitglieder ?? [])
      .map((id) => this.mitgliedOptionen.find((m) => m.id === id)?.label ?? String(id))
      .join(', ');

    const mitalarmiertNamen = (element.mitalarmiert ?? [])
      .map((id) => this.mitalarmiertOptionen.find((o) => o.id === id)?.label ?? String(id))
      .join(', ');

    const payload = {
      druck_datum: heute,
      fw_name: String(this.stammdaten['fw_name'] ?? ''),
      fw_nummer: String(this.stammdaten['fw_nummer'] ?? ''),
      fw_street: String(this.stammdaten['fw_street'] ?? ''),
      fw_plz: String(this.stammdaten['fw_plz'] ?? ''),
      fw_ort: String(this.stammdaten['fw_ort'] ?? ''),
      fw_email: String(this.stammdaten['fw_email'] ?? ''),
      fw_telefon: String(this.stammdaten['fw_telefon'] ?? ''),
      status: element.status ?? '',
      einsatz_datum: this.formatListDateTime(element.einsatz_datum) || element.einsatz_datum || '',
      alarmstichwort: element.alarmstichwort ?? '',
      einsatzart: element.einsatzart ?? '',
      einsatzadresse: element.einsatzadresse ?? '',
      alarmierende_stelle: element.alarmierende_stelle ?? '',
      einsatzleiter: element.einsatzleiter ?? '',
      ausgerueckt: element.ausgerueckt ?? '',
      eingerueckt: element.eingerueckt ?? '',
      lage_beim_eintreffen: element.lage_beim_eintreffen ?? '',
      gesetzte_massnahmen: element.gesetzte_massnahmen ?? '',
      einsatzart_ist_brand: element.einsatzart === 'Brandeinsatz',
      brand_kategorie: element.brand_kategorie ?? '',
      brand_aus: element.brand_aus ?? '',
      einsatzart_ist_technisch: element.einsatzart === 'Technischer Einsatz',
      technisch_kategorie: element.technisch_kategorie ?? '',
      bma_meldergruppe: element.bma_meldergruppe ?? '',
      bma_melder: element.bma_melder ?? '',
      bma_fehl_tauschungsalarm: element.bma_fehl_tauschungsalarm ?? '',
      fahrzeuge_namen: fahrzeugNamen,
      mitglieder_namen: mitgliederNamen,
      mitalarmiert_namen: mitalarmiertNamen,
      blaulichtsms_einsatz_id: element.blaulichtsms_einsatz_id ?? '',
    };

    this.apiHttpService.postBlob(abfrageUrl, payload).subscribe({
      next: (blob: Blob) => {
        if (blob.size === 0) {
          this.uiMessageService.erstelleMessage('error', 'PDF ist leer (0 Bytes).');
          return;
        }
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: (error: unknown) => this.authSessionService.errorAnzeigen(error),
    });
  }
}

