import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import {
  ImrBreadcrumbItem,
  ImrHeaderComponent,
  ImrPageLayoutComponent,
  ImrSectionComponent,
} from '../imr-ui-library';
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
import { DateInputMaskDirective } from '../_directive/date-input-mask.directive';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { IMitglied } from '../_interface/mitglied';
import { IJugendEvent } from '../_interface/jugend_event';
import { IJugendAusbildung } from '../_interface/jugend_ausbildung';
import jugendRegelConfig from './config.json';

type JugendEventKategorie =
  | 'WISSENSTEST'
  | 'ERPROBUNG'
  | 'FERTIGKEITSABZEICHEN_MELDER'
  | 'FERTIGKEITSABZEICHEN_FWTECHNIK'
  | 'FERTIGKEITSABZEICHEN_SICHER_ZU_WASSER';

interface IEventKategorieOption {
  value: JugendEventKategorie;
  label: string;
}

interface IEventTeilnehmerLevelInput {
  pkid: number;
  level: number | null;
}

interface IModulKonfigurationEintrag {
  modul?: string;
  konfiguration?: unknown;
}

type PdfKonfiguration = {
  idJugendEventReport?: string;
  [key: string]: unknown;
};

type StammdatenKonfiguration = {
  fw_name?: string;
  fw_nummer?: string;
  fw_street?: string;
  fw_plz?: string;
  fw_ort?: string;
  fw_email?: string;
  fw_telefon?: string;
  [key: string]: unknown;
};

type JugendRegelTrackKey =
  | 'erprobung'
  | 'wissentest'
  | 'fertigkeit_melder'
  | 'fertigkeit_fwtechnik'
  | 'fertigkeit_sicher_zu_wasser';

interface IJugendLevelRegel {
  min_age?: number;
  max_age?: number;
  min_membership_months?: number;
  requires_all?: string[];
  hinweis?: string;
}

type IJugendTrackRegeln = Partial<Record<'1' | '2' | '3' | '4' | '5', IJugendLevelRegel>>;

interface IJugendRegelKonfiguration {
  schema_version?: number;
  quelle?: string;
  letzte_aktualisierung?: string;
  hinweis?: string;
  regeln?: Partial<Record<JugendRegelTrackKey, IJugendTrackRegeln>>;
}

type IJugendFertigkeitsDatumKey =
  | 'fwtechnik_spiel_datum'
  | 'fwtechnik_datum'
  | 'melder_spiel_datum'
  | 'melder_datum'
  | 'sicher_zu_wasser_spiel_datum'
  | 'sicher_zu_wasser_datum';

@Component({
  selector: 'app-jugend',
  standalone: true,
  imports: [
    ImrHeaderComponent,
    ImrPageLayoutComponent,
    ImrSectionComponent,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
    MatInputModule,
    MatTabsModule,
    DateInputMaskDirective,
  ],
  templateUrl: './jugend.component.html',
  styleUrl: './jugend.component.sass'
})
export class JugendComponent implements OnInit {
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  title = 'Jugend';
  breadcrumb: ImrBreadcrumbItem[] = [];

  mitglieder: IMitglied[] = [];
  jugendMitglieder: IMitglied[] = [];
  jugendAusbildungen: IJugendAusbildung[] = [];
  events: IJugendEvent[] = [];
  ausbildungByMitgliedPkid = new Map<number, IJugendAusbildung>();
  teilnehmerLevelByPkid = new Map<number, number | null>();
  selectedMitglied: IMitglied | null = null;

  dataSourceJugend = new MatTableDataSource<IMitglied>([]);
  dataSourceEvents = new MatTableDataSource<IJugendEvent>([]);

  private readonly desktopSpaltenJugend: string[] = ['stbnr', 'name', 'status', 'alter', 'ueberstellung', 'actions'];
  private readonly mobileSpaltenJugend: string[] = ['stbnr', 'name', 'status', 'alter', 'actions'];

  sichtbareSpaltenJugend: string[] = [...this.desktopSpaltenJugend];
  sichtbareSpaltenEvents: string[] = ['datum', 'kategorie', 'teilnehmer', 'actions'];

  readonly eventKategorien: ReadonlyArray<IEventKategorieOption> = [
    { value: 'WISSENSTEST', label: 'Wissentest' },
    { value: 'ERPROBUNG', label: 'Erprobung' },
    { value: 'FERTIGKEITSABZEICHEN_MELDER', label: 'Fertigkeitsabzeichen Melder' },
    { value: 'FERTIGKEITSABZEICHEN_FWTECHNIK', label: 'Fertigkeitsabzeichen FW-Technik' },
    { value: 'FERTIGKEITSABZEICHEN_SICHER_ZU_WASSER', label: 'Fertigkeitsabzeichen Sicher zu Wasser' },
  ];

  private readonly levelPflichtKategorien = new Set<JugendEventKategorie>([
    'WISSENSTEST',
    'ERPROBUNG',
    'FERTIGKEITSABZEICHEN_MELDER',
    'FERTIGKEITSABZEICHEN_FWTECHNIK',
    'FERTIGKEITSABZEICHEN_SICHER_ZU_WASSER',
  ]);

  private readonly jugendEventKategorieToTrack: Record<JugendEventKategorie, JugendRegelTrackKey> = {
    ERPROBUNG: 'erprobung',
    WISSENSTEST: 'wissentest',
    FERTIGKEITSABZEICHEN_MELDER: 'fertigkeit_melder',
    FERTIGKEITSABZEICHEN_FWTECHNIK: 'fertigkeit_fwtechnik',
    FERTIGKEITSABZEICHEN_SICHER_ZU_WASSER: 'fertigkeit_sicher_zu_wasser',
  };

  private readonly erprobungLevelKeys: ReadonlyArray<readonly [keyof IJugendAusbildung, string]> = [
    ['erprobung_lv1', '1'],
    ['erprobung_lv2', '2'],
    ['erprobung_lv3', '3'],
    ['erprobung_lv4', '4'],
    ['erprobung_lv5', '5'],
  ];

  private readonly wissentestLevelKeys: ReadonlyArray<readonly [keyof IJugendAusbildung, string]> = [
    ['wissentest_lv1', '1'],
    ['wissentest_lv2', '2'],
    ['wissentest_lv3', '3'],
    ['wissentest_lv4', '4'],
    ['wissentest_lv5', '5'],
  ];

  private readonly ausbildungsStationen: ReadonlyArray<readonly [keyof IJugendAusbildung, string]> = [
    ['fwtechnik_spiel_datum', 'FW-Technik Spiel'],
    ['fwtechnik_datum', 'FW-Technik'],
    ['melder_spiel_datum', 'Melder Spiel'],
    ['melder_datum', 'Melder'],
    ['sicher_zu_wasser_spiel_datum', 'Sicher zu Wasser Spiel'],
    ['sicher_zu_wasser_datum', 'Sicher zu Wasser'],
  ];

  private readonly defaultJugendRegelKonfiguration: IJugendRegelKonfiguration =
    jugendRegelConfig as IJugendRegelKonfiguration;

  private jugendRegelKonfiguration: IJugendRegelKonfiguration = this.defaultJugendRegelKonfiguration;
  private pdfKonfiguration: PdfKonfiguration = {};
  private stammdatenKonfiguration: StammdatenKonfiguration = {};
  ausdruckPlanKategorie: JugendEventKategorie | '' = '';
  ausdruckPlanDatum = '';

  showMitgliedDetail = false;
  showEventForm = false;

  formEvent = new FormGroup({
    id: new FormControl<string>(''),
    titel: new FormControl<string>('', { nonNullable: true }),
    datum: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    ort: new FormControl<string>('', { nonNullable: true }),
    kategorie: new FormControl<JugendEventKategorie | ''>('', { nonNullable: true, validators: [Validators.required] }),
    stand_x_override: new FormControl<boolean>(false, { nonNullable: true }),
    teilnehmer_ids: new FormControl<number[]>([], { nonNullable: true }),
  });

  ngOnInit(): void {
    sessionStorage.setItem('PageNumber', '2');
    sessionStorage.setItem('Page2', 'JUGEND');
    this.breadcrumb = this.navigationService.ladeBreadcrumb();
    this.aktualisiereSichtbareSpalten();

    this.loadMitglieder();
    this.loadAusbildung();
    this.loadEvents();
    this.loadStammdatenKonfiguration();
    this.loadJugendRegelKonfiguration();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.aktualisiereSichtbareSpalten();
  }

  loadMitglieder(): void {
    this.apiHttpService.get<IMitglied[]>('jugend/mitglieder').subscribe({
      next: (erg) => {
        this.mitglieder = this.collectionUtilsService.arraySortByKey(erg, 'stbnr');
        this.jugendMitglieder = this.mitglieder.filter((m) => this.normalizeStatus(m.dienststatus) === 'JUGEND');
        this.dataSourceJugend.data = this.jugendMitglieder;
      },
      error: (error) => this.authSessionService.errorAnzeigen(error),
    });
  }

  loadEvents(): void {
    this.apiHttpService.get<IJugendEvent[]>('jugend/events').subscribe({
      next: (erg) => {
        this.events = erg;
        this.dataSourceEvents.data = erg;
      },
      error: (error) => this.authSessionService.errorAnzeigen(error),
    });
  }

  loadAusbildung(): void {
    this.apiHttpService.get<IJugendAusbildung[]>('jugend/ausbildung').subscribe({
      next: (erg) => {
        this.jugendAusbildungen = erg;
        this.ausbildungByMitgliedPkid = new Map<number, IJugendAusbildung>(
          erg.map((item) => [item.mitglied, item]),
        );
      },
      error: (error) => this.authSessionService.errorAnzeigen(error),
    });
  }

  viewMitglied(element: IMitglied): void {
    this.showMitgliedDetail = true;
    this.selectedMitglied = element;
  }

  neuesEvent(): void {
    this.showEventForm = true;
    this.teilnehmerLevelByPkid.clear();
    this.formEvent.reset({
      id: '',
      titel: '',
      datum: '',
      ort: '',
      kategorie: '',
      stand_x_override: false,
      teilnehmer_ids: [],
    });
  }

  editEvent(event: IJugendEvent): void {
    this.showEventForm = true;

    this.teilnehmerLevelByPkid = new Map<number, number | null>(
      (event.teilnehmer ?? []).map((m) => [m.pkid, m.level ?? null]),
    );

    this.formEvent.setValue({
      id: event.id,
      titel: event.titel,
      datum: event.datum,
      ort: event.ort ?? '',
      kategorie: this.parseEventKategorie(event.kategorie),
      stand_x_override: event.stand_x_override === true,
      teilnehmer_ids: (event.teilnehmer ?? []).map((m) => m.pkid),
    });

    this.synchronisiereTitelMitKategorie();

    this.onEventTeilnehmerAuswahlGeaendert();
  }

  speichernEvent(): void {
    if (this.formEvent.invalid) {
      this.uiMessageService.erstelleMessage('error', 'Bitte Datum und Art ausfüllen.');
      return;
    }

    const kategorie = this.formEvent.controls.kategorie.value;
    const teilnehmerIds = this.formEvent.controls.teilnehmer_ids.value;
    const titel = this.getStandardTitelForKategorie(kategorie) || 'Jugend Event';
    const standXOverride = this.isVoraussetzungenOverrideAktiv();
    const teilnehmerLevels: IEventTeilnehmerLevelInput[] = teilnehmerIds.map((pkid) => ({
      pkid,
      level: this.getTeilnehmerLevel(pkid),
    }));

    if (this.isLevelPflichtKategorie(kategorie) && !standXOverride) {
      const teilnehmerOhneErlaubteStufe = teilnehmerIds.find((pkid) => !this.hatErlaubteEventLevel(pkid));
      if (teilnehmerOhneErlaubteStufe !== null && teilnehmerOhneErlaubteStufe !== undefined) {
        this.uiMessageService.erstelleMessage(
          'error',
          'Mindestens ein ausgewähltes Mitglied hat für diese Art keine erlaubte Stufe laut Voraussetzungen.',
        );
        return;
      }

      const missingLevel = teilnehmerLevels.some((item) => item.level === null);
      if (missingLevel) {
        this.uiMessageService.erstelleMessage(
          'error',
          'Für jedes ausgewählte Thema muss pro Teilnehmer ein Level erfasst werden.',
        );
        return;
      }
    }

    if (!standXOverride) {
      const ungueltigeLevel = teilnehmerLevels.find(
        (item) => item.level !== null && !this.istEventLevelErlaubt(item.pkid, item.level),
      );
      if (ungueltigeLevel) {
        this.uiMessageService.erstelleMessage(
          'error',
          'Mindestens ein ausgewähltes Level ist laut Voraussetzungen nicht erlaubt.',
        );
        return;
      }
    }

    const payload = {
      titel,
      datum: this.formEvent.controls.datum.value,
      ort: this.formEvent.controls.ort.value,
      kategorie,
      stand_x_override: standXOverride,
      teilnehmer_ids: teilnehmerIds,
      teilnehmer_levels: teilnehmerLevels,
    };

    const id = this.formEvent.controls.id.value;
    if (!id) {
      this.apiHttpService.post('jugend/events', payload, false).subscribe({
        next: () => {
          this.uiMessageService.erstelleMessage('success', 'Event gespeichert.');
          this.showEventForm = false;
          this.teilnehmerLevelByPkid.clear();
          this.loadEvents();
          this.loadAusbildung();
        },
        error: (error) => this.authSessionService.errorAnzeigen(error),
      });
      return;
    }

    this.apiHttpService.patch('jugend/events', id, payload, false).subscribe({
      next: () => {
        this.uiMessageService.erstelleMessage('success', 'Event aktualisiert.');
        this.showEventForm = false;
        this.teilnehmerLevelByPkid.clear();
        this.loadEvents();
        this.loadAusbildung();
      },
      error: (error) => this.authSessionService.errorAnzeigen(error),
    });
  }

  eventLoeschen(): void {
    const id = this.formEvent.controls.id.value;
    if (!id) {
      return;
    }
    this.apiHttpService.delete('jugend/events', id).subscribe({
      next: () => {
        this.uiMessageService.erstelleMessage('success', 'Event gelöscht.');
        this.showEventForm = false;
        this.teilnehmerLevelByPkid.clear();
        this.loadEvents();
      },
      error: (error) => this.authSessionService.errorAnzeigen(error),
    });
  }

  mitgliedDetailZurueck(): void {
    this.showMitgliedDetail = false;
    this.selectedMitglied = null;
  }

  isJugendMitglied(m: IMitglied | null): boolean {
    return m !== null && this.normalizeStatus(m.dienststatus) === 'JUGEND';
  }

  kannUeberstelltWerden(m: IMitglied | null): boolean {
    if (!m) {
      return false;
    }
    if (this.normalizeStatus(m.dienststatus) !== 'JUGEND') {
      return false;
    }
    return this.getAlter(m) >= 15;
  }

  ueberstellen(m: IMitglied | null): void {
    if (!m || !this.kannUeberstelltWerden(m)) {
      return;
    }
    this.apiHttpService.patch('jugend/mitglieder', m.id, { dienststatus: 'AKTIV' }, false).subscribe({
      next: () => {
        this.uiMessageService.erstelleMessage('success', `${this.getVollerName(m)} wurde in den Aktivstand überstellt.`);
        this.mitgliedDetailZurueck();
        this.loadMitglieder();
      },
      error: (error) => this.authSessionService.errorAnzeigen(error),
    });
  }

  eventFormAbbrechen(): void {
    this.showEventForm = false;
    this.teilnehmerLevelByPkid.clear();
  }

  getVollerName(m: IMitglied): string {
    return `${m.vorname} ${m.nachname}`;
  }

  getRangText(dienstgrad: string | undefined): string {
    const rang = String(dienstgrad ?? '').trim();
    return rang !== '' ? rang : 'ohne Rang';
  }

  get sortedJugendMitglieder(): IMitglied[] {
    const selectedIds = this.formEvent.controls.teilnehmer_ids.value;
    const idToMitglied = new Map(this.jugendMitglieder.map((m) => [m.pkid, m]));

    // Ausgewählte Mitglieder in der Reihenfolge des selectedIds arrays
    const selectedMembers = selectedIds
      .map((id) => idToMitglied.get(id))
      .filter((m): m is IMitglied => m !== undefined);

    // Nicht ausgewählte Mitglieder
    const selectedSet = new Set(selectedIds);
    const unselectedMembers = this.jugendMitglieder.filter((m) => !selectedSet.has(m.pkid));

    return [...selectedMembers, ...unselectedMembers];
  }

  getMitgliedMitRangText(m: IMitglied): string {
    return `${m.stbnr} - ${m.vorname} ${m.nachname} (${this.getRangText(m.dienstgrad)})`;
  }

  onEventTeilnehmerAuswahlGeaendert(): void {
    const selectedIds = new Set(this.formEvent.controls.teilnehmer_ids.value);

    for (const pkid of Array.from(this.teilnehmerLevelByPkid.keys())) {
      if (!selectedIds.has(pkid)) {
        this.teilnehmerLevelByPkid.delete(pkid);
      }
    }

    for (const pkid of selectedIds) {
      if (!this.teilnehmerLevelByPkid.has(pkid)) {
        this.teilnehmerLevelByPkid.set(pkid, null);
      }
    }

    this.ensureTeilnehmerLevelInRange();
  }

  onEventKategorieGeaendert(): void {
    this.ensureTeilnehmerLevelInRange();
    this.synchronisiereTitelMitKategorie();
  }

  onStandXOverrideGeaendert(event: MatCheckboxChange): void {
    this.formEvent.controls.stand_x_override.setValue(event.checked);
    this.ensureTeilnehmerLevelInRange(event.checked);
  }

  getAusgewaehlteEventMitglieder(): IMitglied[] {
    const selectedIds = new Set(this.formEvent.controls.teilnehmer_ids.value);
    return this.jugendMitglieder.filter((mitglied) => selectedIds.has(mitglied.pkid));
  }

  getTeilnehmerLevel(pkid: number): number | null {
    return this.teilnehmerLevelByPkid.get(pkid) ?? null;
  }

  setTeilnehmerLevel(pkid: number, level: number | null): void {
    if (level === null) {
      this.teilnehmerLevelByPkid.set(pkid, null);
      return;
    }

    if (!this.istEventLevelErlaubt(pkid, level)) {
      this.teilnehmerLevelByPkid.set(pkid, null);
      return;
    }

    this.teilnehmerLevelByPkid.set(pkid, level);
  }

  getLevelOptionenForMitglied(mitglied: IMitglied): number[] {
    return this.getEventLevelOptionenForMitglied(
      mitglied,
      this.formEvent.controls.kategorie.value,
      this.isVoraussetzungenOverrideAktiv(),
    );
  }

  isVoraussetzungenOverrideAktiv(): boolean {
    return this.formEvent.controls.stand_x_override.value === true;
  }

  getLevelLabel(level: number): string {
    if (this.isFertigkeitsabzeichenKategorie(this.formEvent.controls.kategorie.value)) {
      return this.getFertigkeitsabzeichenLevelDropdownLabel(level);
    }
    return this.getStandardLevelDropdownLabel(level);
  }

  getEventKategorieText(event: IJugendEvent): string {
    if (event.kategorie_label && event.kategorie_label.trim() !== '') {
      return event.kategorie_label;
    }
    return this.getKategorieLabel(this.parseEventKategorie(event.kategorie));
  }

  getStatusText(m: IMitglied): string {
    const status = String(m.dienststatus ?? '').toUpperCase();
    if (status === 'JUGEND') {
      return 'Jugend';
    }
    if (status === 'AKTIV') {
      return 'Aktiv';
    }
    if (status === 'RESERVE') {
      return 'Reserve';
    }
    if (status === 'ABGEMELDET') {
      return 'Abgemeldet';
    }
    return '-';
  }

  getAbzeichenText(m: IMitglied): string {
    const ausbildung = this.getAusbildungByMitglied(m);
    if (!ausbildung) {
      return '-';
    }

    const erprobung = this.erprobungLevelKeys
      .filter(([key]) => Boolean(ausbildung[key]))
      .map(([, level]) => level);

    const wissentest = this.wissentestLevelKeys
      .filter(([key]) => Boolean(ausbildung[key]))
      .map(([, level]) => level);

    const parts: string[] = [];
    if (erprobung.length > 0) {
      parts.push(`Erprobung ${erprobung.join(', ')}`);
    }
    if (wissentest.length > 0) {
      parts.push(`Wissentest ${wissentest.join(', ')}`);
    }

    return parts.length > 0 ? parts.join(' | ') : '-';
  }

  getAusbildungText(m: IMitglied): string {
    const ausbildung = this.getAusbildungByMitglied(m);
    if (!ausbildung) {
      return '-';
    }

    const stationen = this.ausbildungsStationen
      .filter(([key]) => Boolean(ausbildung[key]))
      .map(([, label]) => label);

    return stationen.length > 0 ? stationen.join(', ') : '-';
  }

  getErprobungLevelText(m: IMitglied): string {
    const level = this.getErprobungLevelValue(this.getAusbildungByMitglied(m));
    if (level === 0) {
      return '-';
    }
    return this.getStandardLevelLabel(level);
  }

  getWissentestLevelText(m: IMitglied): string {
    const level = this.getWissentestLevelValue(this.getAusbildungByMitglied(m));
    if (level === 0) {
      return '-';
    }
    return this.getStandardLevelLabel(level);
  }

  getErprobungLevelOptionen(): number[] {
    return [0, 1, 2, 3, 4, 5];
  }

  getWissentestLevelOptionen(): number[] {
    return [0, 1, 2, 3, 4, 5];
  }

  getFertigkeitsabzeichenLevelOptionen(): number[] {
    return [0, 1, 2];
  }

  getStandardLevelLabel(level: number): string {
    if (level === 0) return 'nicht angetreten';
    if (level === 1) return 'Bronze Spiel';
    if (level === 2) return 'Silber Spiel';
    if (level === 3) return 'Bronze';
    if (level === 4) return 'Silber';
    if (level === 5) return 'Gold';
    return `Level ${level}`;
  }

  getStandardLevelDropdownLabel(level: number): string {
    if (level === 0) return 'nicht angetreten';
    if (level === 1) return 'Bronze Spiel';
    if (level === 2) return 'Silber Spiel';
    if (level === 3) return 'Bronze';
    if (level === 4) return 'Silber';
    if (level === 5) return 'Gold';
    return `Level ${level}`;
  }

  getFertigkeitsabzeichenLevelLabel(level: number): string {
    if (level === 0) return 'nicht angetreten';
    if (level === 1) return 'Spiel';
    return 'Abzeichen';
  }

  getFertigkeitsabzeichenLevelDropdownLabel(level: number): string {
    if (level === 0) return 'nicht angetreten';
    if (level === 1) return 'Spiel';
    if (level === 2) return 'Abzeichen';
    return `Level ${level}`;
  }

  getFertigkeitsabzeichenMelderText(m: IMitglied): string {
    return this.getFertigkeitsabzeichenText(m, 'melder_spiel_datum', 'melder_datum');
  }

  getFertigkeitsabzeichenFwTechnikText(m: IMitglied): string {
    return this.getFertigkeitsabzeichenText(m, 'fwtechnik_spiel_datum', 'fwtechnik_datum');
  }

  getFertigkeitsabzeichenSicherZuWasserText(m: IMitglied): string {
    return this.getFertigkeitsabzeichenText(
      m,
      'sicher_zu_wasser_spiel_datum',
      'sicher_zu_wasser_datum',
    );
  }

  getAlter(m: IMitglied): number {
    return this.getAlterAtDate(m, new Date());
  }

  getAlterAtDate(m: IMitglied, referenceDate: Date): number {
    const birth = this.parseDate(m.geburtsdatum);
    if (!birth) return 0;

    let age = referenceDate.getFullYear() - birth.getFullYear();
    const monthDiff = referenceDate.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age;
  }

  getAlterBeimEvent(m: IMitglied, eventDatum: string): number {
    if (typeof eventDatum !== 'string' || eventDatum.trim() === '') {
      return this.getAlter(m);
    }
    const ref = this.parseDate(eventDatum) ?? new Date();
    return this.getAlterAtDate(m, ref);
  }

  isDatumFilled(): boolean {
    const datum = this.formEvent.controls.datum.value;
    return typeof datum === 'string' && datum.trim() !== '';
  }

  onTabChange(index: number): void {
    if (index === 0) {
      this.showMitgliedDetail = false;
      this.selectedMitglied = null;
    } else {
      this.showEventForm = false;
      this.teilnehmerLevelByPkid.clear();
    }
  }

  getMitgliedEvents(m: IMitglied): IJugendEvent[] {
    return this.events.filter((e) => (e.teilnehmer ?? []).some((t) => t.pkid === m.pkid));
  }

  isErprobungLevelErreicht(m: IMitglied, level: number): boolean {
    const ausbildung = this.getAusbildungByMitglied(m);
    if (!ausbildung) return false;
    const key = `erprobung_lv${level}` as keyof IJugendAusbildung;
    return ausbildung[key] === true;
  }

  isWissentestLevelErreicht(m: IMitglied, level: number): boolean {
    const ausbildung = this.getAusbildungByMitglied(m);
    if (!ausbildung) return false;
    const key = `wissentest_lv${level}` as keyof IJugendAusbildung;
    return ausbildung[key] === true;
  }

  getAusbildungLevelDatum(m: IMitglied, prefix: 'erprobung' | 'wissentest', level: number): string {
    const ausbildung = this.getAusbildungByMitglied(m);
    if (!ausbildung) return '';
    const key = `${prefix}_lv${level}_datum` as keyof IJugendAusbildung;
    const val = ausbildung[key];
    return typeof val === 'string' ? val : '';
  }

  getUeberstellungHinweis(m: IMitglied): string {
    if (this.normalizeStatus(m.dienststatus) !== 'JUGEND') {
      return 'Aktiv';
    }

    const age = this.getAlter(m);
    if (age >= 16) {
      return 'Muss in den Aktivstand überstellt werden';
    }
    if (age >= 15) {
      return 'Kann in den Aktivstand überstellt werden';
    }

    const birth = this.parseDate(m.geburtsdatum);
    if (!birth) {
      return 'Kann mit 15, muss mit 16 in den Aktivstand überstellt werden';
    }

    const kannAb = new Date(birth.getFullYear() + 15, birth.getMonth(), birth.getDate());
    const mussAb = new Date(birth.getFullYear() + 16, birth.getMonth(), birth.getDate());
    return `Kann ab ${this.formatDateDe(kannAb)}, muss ab ${this.formatDateDe(mussAb)} überstellt werden`;
  }

  getUeberstellungSpalteText(m: IMitglied): string {
    if (this.normalizeStatus(m.dienststatus) !== 'JUGEND') {
      return 'Aktiv';
    }

    const birth = this.parseDate(m.geburtsdatum);
    if (!birth) {
      return 'kann 15 / muss 16';
    }

    const jahrKann = birth.getFullYear() + 15;
    const jahrMuss = birth.getFullYear() + 16;
    return `kann ${jahrKann} / muss ${jahrMuss}`;
  }

  getEventTeilnehmerText(event: IJugendEvent): string {
    const teilnehmer = event.teilnehmer ?? [];
    if (teilnehmer.length === 0) {
      return '-';
    }

    const isFertigkeitsabzeichen = this.isFertigkeitsabzeichenKategorie(
      this.parseEventKategorie(event.kategorie),
    );

    return teilnehmer
      .map((m) => {
        const levelText = m.level !== null && m.level !== undefined
          ? ` - ${isFertigkeitsabzeichen ? this.getFertigkeitsabzeichenLevelLabel(m.level) : this.getStandardLevelLabel(m.level)}`
          : '';
        return `${m.stbnr} ${m.vorname} ${m.nachname} (${this.getRangText(m.dienstgrad)})${levelText}`;
      })
      .join(', ');
  }

  druckeEventAusdruck(event: IJugendEvent): void {
    const templateId = String(this.pdfKonfiguration.idJugendEventReport ?? '').trim();
    if (!templateId) {
      this.uiMessageService.erstelleMessage(
        'error',
        'Kein PDF-Template konfiguriert. Bitte unter modul_konfiguration den Schlüssel "idJugendEventReport" setzen.',
      );
      return;
    }

    const eventKategorie = this.parseEventKategorie(event.kategorie);
    if (!eventKategorie) {
      this.uiMessageService.erstelleMessage('error', 'Event-Kategorie ist nicht gueltig.');
      return;
    }

    const eventDatumIso = this.toIsoDateOrFallback(event.datum, this.formatDateIso(new Date()));
    const eventTeilnehmerSet = new Set((event.teilnehmer ?? []).map((item) => item.pkid));
    const mitgliederReport = this.baueMitgliederReport(
      eventKategorie,
      eventDatumIso,
      Boolean(event.stand_x_override),
      eventTeilnehmerSet,
    );

    const payload = {
      druck_datum: new Date().toLocaleDateString('de-DE'),
      ...this.buildStammdatenPayload(),
      event: {
        id: event.id,
        titel: event.titel,
        datum: eventDatumIso,
        ort: event.ort ?? '',
        kategorie: eventKategorie,
        kategorie_label: this.getEventKategorieText(event),
        stand_x_override: Boolean(event.stand_x_override),
      },
      jugendmitglieder: mitgliederReport,
      teilnehmer_anzahl: eventTeilnehmerSet.size,
      jugendmitglieder_anzahl: mitgliederReport.length,
    };

    const abfrageUrl = `pdf/templates/${templateId}/render`;
    this.apiHttpService.postBlob(abfrageUrl, payload).subscribe({
      next: (blob: Blob) => {
        if (blob.size === 0) {
          this.uiMessageService.erstelleMessage('error', 'PDF ist leer (0 Bytes).');
          return;
        }
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: (error) => this.authSessionService.errorAnzeigen(error),
    });
  }

  planeNaechsteTeilnahmenAusdruck(): void {
    const templateId = String(this.pdfKonfiguration.idJugendEventReport ?? '').trim();
    if (!templateId) {
      this.uiMessageService.erstelleMessage(
        'error',
        'Kein PDF-Template konfiguriert. Bitte unter modul_konfiguration den Schlüssel "idJugendEventReport" setzen.',
      );
      return;
    }

    const kategorie = this.ausdruckPlanKategorie;
    if (!kategorie) {
      this.uiMessageService.erstelleMessage('error', 'Bitte zuerst eine Eventart auswählen.');
      return;
    }

    const planDatumRaw = String(this.ausdruckPlanDatum ?? '').trim();
    if (planDatumRaw === '') {
      this.uiMessageService.erstelleMessage('error', 'Bitte das geplante Event-Datum angeben.');
      return;
    }

    const parsedPlanDatum = this.parseDate(planDatumRaw);
    if (!parsedPlanDatum && !/^\d{4}-\d{2}-\d{2}$/.test(planDatumRaw)) {
      this.uiMessageService.erstelleMessage('error', 'Bitte ein gueltiges Datum angeben (TT.MM.JJJJ).');
      return;
    }

    const eventDatumIso = this.toIsoDateOrFallback(planDatumRaw, this.formatDateIso(new Date()));
    const mitgliederReport = this.baueMitgliederReport(
      kategorie,
      eventDatumIso,
      false,
      new Set<number>(),
    );

    const payload = {
      druck_datum: new Date().toLocaleDateString('de-DE'),
      ...this.buildStammdatenPayload(),
      event: {
        id: '',
        titel: 'Planung naechste Teilnahmen',
        datum: eventDatumIso,
        ort: '',
        kategorie,
        kategorie_label: this.getKategorieLabel(kategorie),
        stand_x_override: false,
      },
      jugendmitglieder: mitgliederReport,
      teilnehmer_anzahl: 0,
      jugendmitglieder_anzahl: mitgliederReport.length,
      planungsmodus: true,
    };

    const abfrageUrl = `pdf/templates/${templateId}/render`;
    this.apiHttpService.postBlob(abfrageUrl, payload).subscribe({
      next: (blob: Blob) => {
        if (blob.size === 0) {
          this.uiMessageService.erstelleMessage('error', 'PDF ist leer (0 Bytes).');
          return;
        }
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: (error) => this.authSessionService.errorAnzeigen(error),
    });
  }

  private baueMitgliederReport(
    eventKategorie: JugendEventKategorie,
    eventDatumIso: string,
    standXOverride: boolean,
    eventTeilnehmerSet: Set<number>,
  ): Array<Record<string, unknown>> {
    return this.jugendMitglieder.map((mitglied) => {
      const erreichteStufe = this.getBereitsErreichtesLevelFuerKategorie(mitglied, eventKategorie);
      const erlaubteLevel = this.getErlaubteLevelFuerMitgliedUndKategorieImKontext(
        mitglied,
        eventKategorie,
        eventDatumIso,
        standXOverride,
      );
      const naechsteStufe = erlaubteLevel.length > 0 ? erlaubteLevel[0] : null;
      const istFertigkeitsabzeichen = this.isFertigkeitsabzeichenKategorie(eventKategorie);

      return {
        stbnr: mitglied.stbnr,
        vorname: mitglied.vorname,
        nachname: mitglied.nachname,
        dienstgrad: this.getRangText(mitglied.dienstgrad),
        alter_bei_event: this.getAlterBeimEvent(mitglied, eventDatumIso),
        teilnahme_markiert: eventTeilnehmerSet.has(mitglied.pkid),
        teilnahme_text: eventTeilnehmerSet.has(mitglied.pkid) ? 'Ja' : 'Nein',
        aktueller_stand_level: erreichteStufe,
        aktueller_stand_text: erreichteStufe > 0
          ? (istFertigkeitsabzeichen
            ? this.getFertigkeitsabzeichenLevelDropdownLabel(erreichteStufe)
            : this.getStandardLevelDropdownLabel(erreichteStufe))
          : '-',
        naechste_stufe_level: naechsteStufe,
        naechste_stufe_text: naechsteStufe !== null
          ? (istFertigkeitsabzeichen
            ? this.getFertigkeitsabzeichenLevelDropdownLabel(naechsteStufe)
            : this.getStandardLevelDropdownLabel(naechsteStufe))
          : 'noch nicht berechtigt',
      };
    });
  }

  private isLevelPflichtKategorie(kategorie: JugendEventKategorie | ''): boolean {
    if (kategorie === '') {
      return false;
    }
    return this.levelPflichtKategorien.has(kategorie);
  }

  private isFertigkeitsabzeichenKategorie(kategorie: JugendEventKategorie | ''): boolean {
    return kategorie === 'FERTIGKEITSABZEICHEN_MELDER'
      || kategorie === 'FERTIGKEITSABZEICHEN_FWTECHNIK'
      || kategorie === 'FERTIGKEITSABZEICHEN_SICHER_ZU_WASSER';
  }

  private getMaxLevelForKategorie(kategorie: JugendEventKategorie | ''): number {
    if (this.isFertigkeitsabzeichenKategorie(kategorie)) {
      return 2;
    }
    return 5;
  }

  private ensureTeilnehmerLevelInRange(voraussetzungenOverride = this.isVoraussetzungenOverrideAktiv()): void {
    for (const [pkid, level] of this.teilnehmerLevelByPkid.entries()) {
      if (level === null || level === undefined) {
        continue;
      }

      if (!this.istEventLevelErlaubt(pkid, level, voraussetzungenOverride)) {
        this.teilnehmerLevelByPkid.set(pkid, null);
      }
    }
  }

  private istEventLevelErlaubt(pkid: number, level: number, voraussetzungenOverride = this.isVoraussetzungenOverrideAktiv()): boolean {
    const mitglied = this.jugendMitglieder.find((item) => item.pkid === pkid);
    if (!mitglied) {
      return false;
    }

    const erlaubteLevel = this.getEventLevelOptionenForMitglied(
      mitglied,
      this.formEvent.controls.kategorie.value,
      voraussetzungenOverride,
    );
    return erlaubteLevel.includes(level);
  }

  private hatErlaubteEventLevel(pkid: number, voraussetzungenOverride = this.isVoraussetzungenOverrideAktiv()): boolean {
    const mitglied = this.jugendMitglieder.find((item) => item.pkid === pkid);
    if (!mitglied) {
      return false;
    }

    const erlaubteLevel = this.getEventLevelOptionenForMitglied(
      mitglied,
      this.formEvent.controls.kategorie.value,
      voraussetzungenOverride,
    );
    return erlaubteLevel.length > 0;
  }

  private getEventLevelOptionenForMitglied(
    mitglied: IMitglied,
    kategorie: JugendEventKategorie | '',
    voraussetzungenOverride: boolean,
  ): number[] {
    if (kategorie === '') {
      return [];
    }

    if (voraussetzungenOverride) {
      return Array.from({ length: this.getMaxLevelForKategorie(kategorie) }, (_, index) => index + 1);
    }

    return this.getErlaubteLevelFuerMitgliedUndKategorie(mitglied, kategorie, false);
  }

  private getErlaubteLevelFuerMitgliedUndKategorie(
    mitglied: IMitglied,
    kategorie: JugendEventKategorie | '',
    voraussetzungenOverride = this.isVoraussetzungenOverrideAktiv(),
  ): number[] {
    return this.getErlaubteLevelFuerMitgliedUndKategorieImKontext(
      mitglied,
      kategorie,
      this.formEvent.controls.datum.value,
      voraussetzungenOverride,
    );
  }

  private getErlaubteLevelFuerMitgliedUndKategorieImKontext(
    mitglied: IMitglied,
    kategorie: JugendEventKategorie | '',
    eventDatum: string,
    voraussetzungenOverride: boolean,
  ): number[] {
    if (kategorie === '') {
      return [];
    }

    const track = this.getTrackForKategorie(kategorie);
    if (!track) {
      return [];
    }

    const referenceDate = eventDatum ? (this.parseDate(eventDatum) ?? new Date()) : new Date();
    const age = this.getAlterAtDate(mitglied, referenceDate);
    const erreichteTokens = this.getErreichteTokensFuerMitglied(mitglied);
    const bereitsErreichtesLevel = this.getBereitsErreichtesLevelFuerKategorie(mitglied, kategorie);
    const maxLevel = this.getMaxLevelForKategorie(kategorie);
    if (voraussetzungenOverride) {
      return Array.from({ length: maxLevel }, (_, idx) => idx + 1)
        .filter((level) => level > bereitsErreichtesLevel);
    }
    const erlaubte: number[] = [];

    for (let level = 1; level <= maxLevel; level += 1) {
      const regel = this.getRegelForLevel(track, level);
      if (!regel) {
        erlaubte.push(level);
        continue;
      }

      if (regel.min_age !== null && regel.min_age !== undefined && age < regel.min_age) {
        continue;
      }

      if (regel.max_age !== null && regel.max_age !== undefined && age > regel.max_age) {
        continue;
      }

      const requiresAll = regel.requires_all ?? [];
      const alleVoraussetzungenErfuellt = requiresAll.every((token) => erreichteTokens.has(token));
      if (!alleVoraussetzungenErfuellt) {
        continue;
      }

      erlaubte.push(level);
    }

    return erlaubte.filter((level) => level > bereitsErreichtesLevel);
  }

  private getBereitsErreichtesLevelFuerKategorie(
    mitglied: IMitglied,
    kategorie: JugendEventKategorie,
  ): number {
    const ausbildung = this.getAusbildungByMitglied(mitglied);
    if (!ausbildung) {
      return 0;
    }

    if (kategorie === 'ERPROBUNG') {
      return this.getErprobungLevelValue(ausbildung);
    }

    if (kategorie === 'WISSENSTEST') {
      return this.getWissentestLevelValue(ausbildung);
    }

    if (kategorie === 'FERTIGKEITSABZEICHEN_MELDER') {
      if (ausbildung.melder_datum) return 2;
      if (ausbildung.melder_spiel_datum) return 1;
      return 0;
    }

    if (kategorie === 'FERTIGKEITSABZEICHEN_FWTECHNIK') {
      if (ausbildung.fwtechnik_datum) return 2;
      if (ausbildung.fwtechnik_spiel_datum) return 1;
      return 0;
    }

    if (kategorie === 'FERTIGKEITSABZEICHEN_SICHER_ZU_WASSER') {
      if (ausbildung.sicher_zu_wasser_datum) return 2;
      if (ausbildung.sicher_zu_wasser_spiel_datum) return 1;
      return 0;
    }

    return 0;
  }

  private getTrackForKategorie(kategorie: JugendEventKategorie): JugendRegelTrackKey | null {
    return this.jugendEventKategorieToTrack[kategorie] ?? null;
  }

  private getErreichteTokensFuerMitglied(mitglied: IMitglied): Set<string> {
    const tokens = new Set<string>();
    const ausbildung = this.getAusbildungByMitglied(mitglied);
    if (!ausbildung) {
      return tokens;
    }

    for (let level = 1; level <= 5; level += 1) {
      const erprobungDone = ausbildung[`erprobung_lv${level}` as keyof IJugendAusbildung] === true;
      if (erprobungDone) {
        tokens.add(this.buildRegelToken('erprobung', level));
      }
      const wissentestDone = ausbildung[`wissentest_lv${level}` as keyof IJugendAusbildung] === true;
      if (wissentestDone) {
        tokens.add(this.buildRegelToken('wissentest', level));
      }
    }

    const melderSpiel = Boolean(ausbildung.melder_spiel_datum);
    const melderAbzeichen = Boolean(ausbildung.melder_datum);
    if (melderSpiel || melderAbzeichen) {
      tokens.add(this.buildRegelToken('fertigkeit_melder', 1));
    }
    if (melderAbzeichen) {
      tokens.add(this.buildRegelToken('fertigkeit_melder', 2));
    }

    const fwSpiel = Boolean(ausbildung.fwtechnik_spiel_datum);
    const fwAbzeichen = Boolean(ausbildung.fwtechnik_datum);
    if (fwSpiel || fwAbzeichen) {
      tokens.add(this.buildRegelToken('fertigkeit_fwtechnik', 1));
    }
    if (fwAbzeichen) {
      tokens.add(this.buildRegelToken('fertigkeit_fwtechnik', 2));
    }

    const wasserSpiel = Boolean(ausbildung.sicher_zu_wasser_spiel_datum);
    const wasserAbzeichen = Boolean(ausbildung.sicher_zu_wasser_datum);
    if (wasserSpiel || wasserAbzeichen) {
      tokens.add(this.buildRegelToken('fertigkeit_sicher_zu_wasser', 1));
    }
    if (wasserAbzeichen) {
      tokens.add(this.buildRegelToken('fertigkeit_sicher_zu_wasser', 2));
    }

    return tokens;
  }

  private parseEventKategorie(value: string | undefined): JugendEventKategorie | '' {
    const normalized = String(value ?? '').trim().toUpperCase();
    if (normalized === 'WISSENSTEST') return 'WISSENSTEST';
    if (normalized === 'ERPROBUNG') return 'ERPROBUNG';
    if (normalized === 'FERTIGKEITSABZEICHEN_MELDER' || normalized === 'MELDER') {
      return 'FERTIGKEITSABZEICHEN_MELDER';
    }
    if (normalized === 'FERTIGKEITSABZEICHEN_FWTECHNIK' || normalized === 'FWTECHNIK') {
      return 'FERTIGKEITSABZEICHEN_FWTECHNIK';
    }
    if (normalized === 'FERTIGKEITSABZEICHEN_SICHER_ZU_WASSER' || normalized === 'SICHER_ZU_WASSER') {
      return 'FERTIGKEITSABZEICHEN_SICHER_ZU_WASSER';
    }
    if (normalized === 'SONSTIGES') {
      return 'ERPROBUNG';
    }
    return '';
  }

  private getKategorieLabel(kategorie: JugendEventKategorie | ''): string {
    const option = this.eventKategorien.find((item) => item.value === kategorie);
    return option ? option.label : '-';
  }

  private aktualisiereSichtbareSpalten(): void {
    const isMobile = window.innerWidth <= 768;
    this.sichtbareSpaltenJugend = isMobile
      ? [...this.mobileSpaltenJugend]
      : [...this.desktopSpaltenJugend];
  }

  private getStandardTitelForKategorie(kategorie: JugendEventKategorie | ''): string {
    const option = this.eventKategorien.find((item) => item.value === kategorie);
    return option ? option.label : '';
  }

  private synchronisiereTitelMitKategorie(): void {
    const standardTitel = this.getStandardTitelForKategorie(this.formEvent.controls.kategorie.value);
    if (standardTitel === '') {
      return;
    }

    const titelControl = this.formEvent.controls.titel;
    if (titelControl.value.trim() !== standardTitel) {
      titelControl.setValue(standardTitel);
    }
  }

  private normalizeStatus(value: string | undefined): 'JUGEND' | 'AKTIV' {
    return String(value ?? 'AKTIV').toUpperCase() === 'JUGEND' ? 'JUGEND' : 'AKTIV';
  }

  private getAusbildungByMitglied(mitglied: IMitglied): IJugendAusbildung | undefined {
    return this.ausbildungByMitgliedPkid.get(mitglied.pkid);
  }

  private loadJugendRegelKonfiguration(): void {
    this.apiHttpService.get<unknown>('modul_konfiguration').subscribe({
      next: (erg) => {
        const eintraege = this.extractModulKonfigurationListe(erg);
        const pdfEintrag = eintraege.find(
          (item) => String(item?.modul ?? '').trim().toLowerCase() === 'pdf',
        );
        if (pdfEintrag && typeof pdfEintrag.konfiguration === 'object' && pdfEintrag.konfiguration !== null) {
          this.pdfKonfiguration = pdfEintrag.konfiguration as PdfKonfiguration;
        } else {
          this.pdfKonfiguration = {};
        }

        const jugendEintrag = eintraege.find(
          (item) => String(item?.modul ?? '').trim().toLowerCase() === 'jugend',
        );

        if (!jugendEintrag || typeof jugendEintrag.konfiguration !== 'object' || jugendEintrag.konfiguration === null) {
          this.jugendRegelKonfiguration = this.defaultJugendRegelKonfiguration;
          return;
        }

        this.jugendRegelKonfiguration = this.mergeJugendRegelKonfiguration(
          jugendEintrag.konfiguration as IJugendRegelKonfiguration,
        );
      },
      error: () => {
        this.pdfKonfiguration = {};
        this.jugendRegelKonfiguration = this.defaultJugendRegelKonfiguration;
      },
    });
  }

  private loadStammdatenKonfiguration(): void {
    this.apiHttpService.get<unknown>('konfiguration').subscribe({
      next: (erg) => {
        const eintrag = this.extractStammdatenEintrag(erg);
        this.stammdatenKonfiguration = eintrag ?? {};
      },
      error: () => {
        this.stammdatenKonfiguration = {};
      },
    });
  }

  private extractStammdatenEintrag(payload: unknown): StammdatenKonfiguration | null {
    if (Array.isArray(payload)) {
      return (payload[0] as StammdatenKonfiguration) ?? null;
    }

    if (payload && typeof payload === 'object') {
      const main = (payload as { main?: unknown }).main;
      if (Array.isArray(main)) {
        return (main[0] as StammdatenKonfiguration) ?? null;
      }

      return payload as StammdatenKonfiguration;
    }

    return null;
  }

  private buildStammdatenPayload(): Record<string, string> {
    return {
      fw_name: String(this.stammdatenKonfiguration.fw_name ?? ''),
      fw_nummer: String(this.stammdatenKonfiguration.fw_nummer ?? ''),
      fw_street: String(this.stammdatenKonfiguration.fw_street ?? ''),
      fw_plz: String(this.stammdatenKonfiguration.fw_plz ?? ''),
      fw_ort: String(this.stammdatenKonfiguration.fw_ort ?? ''),
      fw_email: String(this.stammdatenKonfiguration.fw_email ?? ''),
      fw_telefon: String(this.stammdatenKonfiguration.fw_telefon ?? ''),
    };
  }

  private extractModulKonfigurationListe(payload: unknown): IModulKonfigurationEintrag[] {
    if (Array.isArray(payload)) {
      return payload as IModulKonfigurationEintrag[];
    }

    if (payload && typeof payload === 'object') {
      const main = (payload as { main?: unknown }).main;
      if (Array.isArray(main)) {
        return main as IModulKonfigurationEintrag[];
      }
    }

    return [];
  }

  private mergeJugendRegelKonfiguration(config: IJugendRegelKonfiguration): IJugendRegelKonfiguration {
    const base = this.defaultJugendRegelKonfiguration;
    const baseRegeln = base.regeln ?? {};
    const inputRegeln = config.regeln ?? {};

    return {
      ...base,
      ...config,
      regeln: {
        ...baseRegeln,
        ...inputRegeln,
        erprobung: {
          ...(baseRegeln.erprobung ?? {}),
          ...(inputRegeln.erprobung ?? {}),
        },
        wissentest: {
          ...(baseRegeln.wissentest ?? {}),
          ...(inputRegeln.wissentest ?? {}),
        },
        fertigkeit_melder: {
          ...(baseRegeln.fertigkeit_melder ?? {}),
          ...(inputRegeln.fertigkeit_melder ?? {}),
        },
        fertigkeit_fwtechnik: {
          ...(baseRegeln.fertigkeit_fwtechnik ?? {}),
          ...(inputRegeln.fertigkeit_fwtechnik ?? {}),
        },
        fertigkeit_sicher_zu_wasser: {
          ...(baseRegeln.fertigkeit_sicher_zu_wasser ?? {}),
          ...(inputRegeln.fertigkeit_sicher_zu_wasser ?? {}),
        },
      },
    };
  }

  private buildRegelToken(track: JugendRegelTrackKey, level: number): string {
    return `${track}_${level}`;
  }

  private getRegelForLevel(track: JugendRegelTrackKey, level: number): IJugendLevelRegel | undefined {
    return this.jugendRegelKonfiguration.regeln?.[track]?.[String(level) as '1' | '2' | '3' | '4' | '5'];
  }

  private getErprobungLevelValue(ausbildung: IJugendAusbildung | undefined): number {
    if (!ausbildung) return 0;
    if (ausbildung.erprobung_lv5) return 5;
    if (ausbildung.erprobung_lv4) return 4;
    if (ausbildung.erprobung_lv3) return 3;
    if (ausbildung.erprobung_lv2) return 2;
    if (ausbildung.erprobung_lv1) return 1;
    return 0;
  }

  private getWissentestLevelValue(ausbildung: IJugendAusbildung | undefined): number {
    if (!ausbildung) return 0;
    if (ausbildung.wissentest_lv5) return 5;
    if (ausbildung.wissentest_lv4) return 4;
    if (ausbildung.wissentest_lv3) return 3;
    if (ausbildung.wissentest_lv2) return 2;
    if (ausbildung.wissentest_lv1) return 1;
    return 0;
  }

  private toIsoDateOrFallback(value: string | null | undefined, fallback: string): string {
    const trimmed = String(value ?? '').trim();
    if (trimmed === '') {
      return fallback;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = this.parseDate(trimmed);
    if (!parsed) {
      return fallback;
    }

    return this.formatDateIso(parsed);
  }

  private formatDateIso(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDateDe(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  private getFertigkeitsabzeichenText(
    mitglied: IMitglied,
    spielField: IJugendFertigkeitsDatumKey,
    abzeichenField: IJugendFertigkeitsDatumKey,
  ): string {
    const ausbildung = this.getAusbildungByMitglied(mitglied);
    if (!ausbildung) {
      return '-';
    }

    const spielDatum = ausbildung[spielField];
    const abzeichenDatum = ausbildung[abzeichenField];

    if (spielDatum && abzeichenDatum) {
      return `Spiel (${spielDatum}) | Abzeichen (${abzeichenDatum})`;
    }
    if (spielDatum) {
      return `Spiel (${spielDatum})`;
    }
    if (abzeichenDatum) {
      return `Abzeichen (${abzeichenDatum})`;
    }
    return '-';
  }

  private parseDate(input: string | undefined): Date | null {
    if (!input) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const [y, m, d] = input.split('-').map((n) => Number(n));
      return new Date(y, m - 1, d);
    }

    if (/^\d{2}\.\d{2}\.\d{4}$/.test(input)) {
      const [d, m, y] = input.split('.').map((n) => Number(n));
      return new Date(y, m - 1, d);
    }

    const parsed = new Date(input);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}

