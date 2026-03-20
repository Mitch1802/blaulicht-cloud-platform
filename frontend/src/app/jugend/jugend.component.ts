import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { Observable, of } from 'rxjs';
import { IMR_UI_COMPONENTS } from '../imr-ui-library';
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
import { DateInputMaskDirective } from '../_directive/date-input-mask.directive';
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

type MitgliedLevelControlKey =
  | 'erprobung_level'
  | 'wissentest_level'
  | 'fertigkeit_melder_level'
  | 'fertigkeit_fwtechnik_level'
  | 'fertigkeit_sicher_zu_wasser_level';

type MitgliedDatumControlKey =
  | 'erprobung_datum'
  | 'wissentest_datum'
  | 'fertigkeit_melder_datum'
  | 'fertigkeit_fwtechnik_datum'
  | 'fertigkeit_sicher_zu_wasser_datum';

interface IMitgliedRegelDefinition {
  track: JugendRegelTrackKey;
  label: string;
  levelControl: MitgliedLevelControlKey;
  dateControl: MitgliedDatumControlKey;
  fertigkeit: boolean;
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
    ...IMR_UI_COMPONENTS,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatInputModule,
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
  breadcrumb: any[] = [];

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

  private readonly tokenLabelMap: Record<string, string> = {
    erprobung_1: 'Erprobung Stufe 1',
    erprobung_2: 'Erprobung Stufe 2',
    erprobung_3: 'Erprobung Stufe 3',
    erprobung_4: 'Erprobung Stufe 4',
    erprobung_5: 'Erprobung Stufe 5',
    wissentest_1: 'Wissentest Stufe 1',
    wissentest_2: 'Wissentest Stufe 2',
    wissentest_3: 'Wissentest Stufe 3',
    wissentest_4: 'Wissentest Stufe 4',
    wissentest_5: 'Wissentest Stufe 5',
    fertigkeit_melder_1: 'Fertigkeitsabzeichen Melder Spiel',
    fertigkeit_melder_2: 'Fertigkeitsabzeichen Melder',
    fertigkeit_fwtechnik_1: 'Fertigkeitsabzeichen FW-Technik Spiel',
    fertigkeit_fwtechnik_2: 'Fertigkeitsabzeichen FW-Technik',
    fertigkeit_sicher_zu_wasser_1: 'Fertigkeitsabzeichen Sicher zu Wasser Spiel',
    fertigkeit_sicher_zu_wasser_2: 'Fertigkeitsabzeichen Sicher zu Wasser',
  };

  private readonly mitgliedRegelDefinitionen: ReadonlyArray<IMitgliedRegelDefinition> = [
    {
      track: 'erprobung',
      label: 'Erprobung',
      levelControl: 'erprobung_level',
      dateControl: 'erprobung_datum',
      fertigkeit: false,
    },
    {
      track: 'wissentest',
      label: 'Wissentest',
      levelControl: 'wissentest_level',
      dateControl: 'wissentest_datum',
      fertigkeit: false,
    },
    {
      track: 'fertigkeit_melder',
      label: 'Fertigkeitsabzeichen Melder',
      levelControl: 'fertigkeit_melder_level',
      dateControl: 'fertigkeit_melder_datum',
      fertigkeit: true,
    },
    {
      track: 'fertigkeit_fwtechnik',
      label: 'Fertigkeitsabzeichen FW-Technik',
      levelControl: 'fertigkeit_fwtechnik_level',
      dateControl: 'fertigkeit_fwtechnik_datum',
      fertigkeit: true,
    },
    {
      track: 'fertigkeit_sicher_zu_wasser',
      label: 'Fertigkeitsabzeichen Sicher zu Wasser',
      levelControl: 'fertigkeit_sicher_zu_wasser_level',
      dateControl: 'fertigkeit_sicher_zu_wasser_datum',
      fertigkeit: true,
    },
  ];

  showMitgliedForm = false;
  showEventForm = false;

  formMitglied = new FormGroup({
    id: new FormControl<string>(''),
    dienststatus: new FormControl<'JUGEND' | 'AKTIV'>('JUGEND', { nonNullable: true }),
    erprobung_level: new FormControl<number>(0, { nonNullable: true }),
    erprobung_datum: new FormControl<string>('', { nonNullable: true }),
    wissentest_level: new FormControl<number>(0, { nonNullable: true }),
    wissentest_datum: new FormControl<string>('', { nonNullable: true }),
    fertigkeit_melder_level: new FormControl<number>(0, { nonNullable: true }),
    fertigkeit_melder_datum: new FormControl<string>('', { nonNullable: true }),
    fertigkeit_fwtechnik_level: new FormControl<number>(0, { nonNullable: true }),
    fertigkeit_fwtechnik_datum: new FormControl<string>('', { nonNullable: true }),
    fertigkeit_sicher_zu_wasser_level: new FormControl<number>(0, { nonNullable: true }),
    fertigkeit_sicher_zu_wasser_datum: new FormControl<string>('', { nonNullable: true }),
  });

  formEvent = new FormGroup({
    id: new FormControl<string>(''),
    titel: new FormControl<string>('', { nonNullable: true }),
    datum: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    ort: new FormControl<string>('', { nonNullable: true }),
    kategorie: new FormControl<JugendEventKategorie | ''>('', { nonNullable: true, validators: [Validators.required] }),
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

  editMitglied(element: IMitglied): void {
    this.showMitgliedForm = true;
    this.showEventForm = false;
    this.teilnehmerLevelByPkid.clear();
    this.selectedMitglied = element;

    const ausbildung = this.getAusbildungByMitglied(element);

    this.formMitglied.setValue({
      id: element.id,
      dienststatus: this.normalizeStatus(element.dienststatus),
      erprobung_level: this.getErprobungLevelValue(ausbildung),
      erprobung_datum: this.getErprobungLevelDatumValue(ausbildung),
      wissentest_level: this.getWissentestLevelValue(ausbildung),
      wissentest_datum: this.getWissentestLevelDatumValue(ausbildung),
      fertigkeit_melder_level: this.getFertigkeitsabzeichenLevelValue(ausbildung, 'melder_spiel_datum', 'melder_datum'),
      fertigkeit_melder_datum: this.getFertigkeitsabzeichenDatumValue(ausbildung, 'melder_spiel_datum', 'melder_datum'),
      fertigkeit_fwtechnik_level: this.getFertigkeitsabzeichenLevelValue(ausbildung, 'fwtechnik_spiel_datum', 'fwtechnik_datum'),
      fertigkeit_fwtechnik_datum: this.getFertigkeitsabzeichenDatumValue(
        ausbildung,
        'fwtechnik_spiel_datum',
        'fwtechnik_datum',
      ),
      fertigkeit_sicher_zu_wasser_level: this.getFertigkeitsabzeichenLevelValue(
        ausbildung,
        'sicher_zu_wasser_spiel_datum',
        'sicher_zu_wasser_datum',
      ),
      fertigkeit_sicher_zu_wasser_datum: this.getFertigkeitsabzeichenDatumValue(
        ausbildung,
        'sicher_zu_wasser_spiel_datum',
        'sicher_zu_wasser_datum',
      ),
    });
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
      teilnehmer_ids: (event.teilnehmer ?? []).map((m) => m.pkid),
    });

    this.synchronisiereTitelMitKategorie();

    this.onEventTeilnehmerAuswahlGeaendert();
  }

  speichernMitglied(): void {
    const id = this.formMitglied.controls.id.value;
    const selectedMitglied = this.selectedMitglied;
    if (!id || !selectedMitglied) {
      return;
    }

    const voraussetzungsFehler = this.pruefeMitgliedVoraussetzungen(selectedMitglied);
    if (voraussetzungsFehler.length > 0) {
      this.uiMessageService.erstelleMessage('error', voraussetzungsFehler.join('\n'));
      return;
    }

    const payload = {
      dienststatus: this.formMitglied.controls.dienststatus.value,
    };

    this.apiHttpService.patch('jugend/mitglieder', id, payload, false).subscribe({
      next: () => {
        this.speichereJugendAusbildung(selectedMitglied).subscribe({
          next: () => {
            this.uiMessageService.erstelleMessage('success', 'Jugend-Mitglied aktualisiert.');
            this.showMitgliedForm = false;
            this.selectedMitglied = null;
            this.loadMitglieder();
            this.loadAusbildung();
          },
          error: (error) => this.authSessionService.errorAnzeigen(error),
        });
      },
      error: (error) => this.authSessionService.errorAnzeigen(error),
    });
  }

  speichernEvent(): void {
    if (this.formEvent.invalid) {
      this.uiMessageService.erstelleMessage('error', 'Bitte Datum und Art ausfüllen.');
      return;
    }

    const kategorie = this.formEvent.controls.kategorie.value;
    const teilnehmerIds = this.formEvent.controls.teilnehmer_ids.value;
    const titel = this.getStandardTitelForKategorie(kategorie) || 'Jugend Event';
    const teilnehmerLevels: IEventTeilnehmerLevelInput[] = teilnehmerIds.map((pkid) => ({
      pkid,
      level: this.getTeilnehmerLevel(pkid),
    }));

    if (this.isLevelPflichtKategorie(kategorie)) {
      const teilnehmerOhneErlaubteStufe = teilnehmerIds.find((pkid) => !this.hatErlaubteEventLevel(pkid));
      if (teilnehmerOhneErlaubteStufe != null) {
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

    const payload = {
      titel,
      datum: this.formEvent.controls.datum.value,
      ort: this.formEvent.controls.ort.value,
      kategorie,
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

  mitgliedFormAbbrechen(): void {
    this.showMitgliedForm = false;
    this.selectedMitglied = null;
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
    return this.getErlaubteLevelFuerMitgliedUndKategorie(
      mitglied,
      this.formEvent.controls.kategorie.value,
    );
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
    if (level === 1) return '1 - Bronze Spiel';
    if (level === 2) return '2 - Silber Spiel';
    if (level === 3) return '3 - Bronze';
    if (level === 4) return '4 - Silber';
    if (level === 5) return '5 - Gold';
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
    if (level === 1) return 'Level 1 (Spiel)';
    return 'Level 2 (Abzeichen)';
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
    const birth = this.parseDate(m.geburtsdatum);
    if (!birth) return 0;

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age;
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
        const levelText = m.level != null
          ? ` - ${isFertigkeitsabzeichen ? this.getFertigkeitsabzeichenLevelLabel(m.level) : this.getStandardLevelLabel(m.level)}`
          : '';
        return `${m.stbnr} ${m.vorname} ${m.nachname} (${this.getRangText(m.dienstgrad)})${levelText}`;
      })
      .join(', ');
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

  private ensureTeilnehmerLevelInRange(): void {
    for (const [pkid, level] of this.teilnehmerLevelByPkid.entries()) {
      if (level == null) {
        continue;
      }

      if (!this.istEventLevelErlaubt(pkid, level)) {
        this.teilnehmerLevelByPkid.set(pkid, null);
      }
    }
  }

  private istEventLevelErlaubt(pkid: number, level: number): boolean {
    const mitglied = this.jugendMitglieder.find((item) => item.pkid === pkid);
    if (!mitglied) {
      return false;
    }

    const erlaubteLevel = this.getErlaubteLevelFuerMitgliedUndKategorie(
      mitglied,
      this.formEvent.controls.kategorie.value,
    );
    return erlaubteLevel.includes(level);
  }

  private hatErlaubteEventLevel(pkid: number): boolean {
    const mitglied = this.jugendMitglieder.find((item) => item.pkid === pkid);
    if (!mitglied) {
      return false;
    }

    const erlaubteLevel = this.getErlaubteLevelFuerMitgliedUndKategorie(
      mitglied,
      this.formEvent.controls.kategorie.value,
    );
    return erlaubteLevel.length > 0;
  }

  private getErlaubteLevelFuerMitgliedUndKategorie(
    mitglied: IMitglied,
    kategorie: JugendEventKategorie | '',
  ): number[] {
    if (kategorie === '') {
      return [];
    }

    const track = this.getTrackForKategorie(kategorie);
    if (!track) {
      return [];
    }

    const age = this.getAlter(mitglied);
    const erreichteTokens = this.getErreichteTokensFuerMitglied(mitglied);
    const maxLevel = this.getMaxLevelForKategorie(kategorie);
    const erlaubte: number[] = [];

    for (let level = 1; level <= maxLevel; level += 1) {
      const regel = this.getRegelForLevel(track, level);
      if (!regel) {
        erlaubte.push(level);
        continue;
      }

      if (regel.min_age != null && age < regel.min_age) {
        continue;
      }

      if (regel.max_age != null && age > regel.max_age) {
        continue;
      }

      const requiresAll = regel.requires_all ?? [];
      const alleVoraussetzungenErfuellt = requiresAll.every((token) => erreichteTokens.has(token));
      if (!alleVoraussetzungenErfuellt) {
        continue;
      }

      erlaubte.push(level);
    }

    return erlaubte;
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
        const jugendEintrag = eintraege.find(
          (item) => String(item?.modul ?? '').trim().toLowerCase() === 'jugend',
        );

        if (!jugendEintrag || typeof jugendEintrag.konfiguration !== 'object' || jugendEintrag.konfiguration == null) {
          this.jugendRegelKonfiguration = this.defaultJugendRegelKonfiguration;
          return;
        }

        this.jugendRegelKonfiguration = this.mergeJugendRegelKonfiguration(
          jugendEintrag.konfiguration as IJugendRegelKonfiguration,
        );
      },
      error: () => {
        this.jugendRegelKonfiguration = this.defaultJugendRegelKonfiguration;
      },
    });
  }

  private extractModulKonfigurationListe(payload: unknown): any[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && typeof payload === 'object') {
      const main = (payload as { main?: unknown }).main;
      if (Array.isArray(main)) {
        return main;
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

  private pruefeMitgliedVoraussetzungen(mitglied: IMitglied): string[] {
    const alter = this.getAlter(mitglied);
    const geplanteTokens = this.baueGeplanteTokenSetAusForm();
    const fehler: string[] = [];

    for (const definition of this.mitgliedRegelDefinitionen) {
      const level = Number(this.formMitglied.controls[definition.levelControl].value ?? 0);
      if (level <= 0) {
        continue;
      }

      for (let currentLevel = 1; currentLevel <= level; currentLevel += 1) {
        const regel = this.getRegelForLevel(definition.track, currentLevel);
        if (!regel) {
          continue;
        }

        const levelText = definition.fertigkeit
          ? this.getFertigkeitsabzeichenLevelLabel(currentLevel)
          : this.getStandardLevelLabel(currentLevel);

        if (regel.min_age != null && alter < regel.min_age) {
          fehler.push(
            `${definition.label} ${levelText}: Mindestalter ${regel.min_age} Jahre (aktuell ${alter}).`,
          );
          break;
        }

        if (regel.max_age != null && alter > regel.max_age) {
          fehler.push(
            `${definition.label} ${levelText}: Hoechstalter ${regel.max_age} Jahre (aktuell ${alter}).`,
          );
          break;
        }

        const missing = (regel.requires_all ?? []).filter((token) => !geplanteTokens.has(token));
        if (missing.length > 0) {
          const fehlendeTexte = missing.map((token) => this.tokenLabelMap[token] ?? token).join(', ');
          fehler.push(`${definition.label} ${levelText}: Voraussetzung fehlt (${fehlendeTexte}).`);
          break;
        }
      }
    }

    return fehler;
  }

  private baueGeplanteTokenSetAusForm(): Set<string> {
    const tokens = new Set<string>();

    for (const definition of this.mitgliedRegelDefinitionen) {
      const maxLevel = Number(this.formMitglied.controls[definition.levelControl].value ?? 0);
      for (let currentLevel = 1; currentLevel <= maxLevel; currentLevel += 1) {
        tokens.add(this.buildRegelToken(definition.track, currentLevel));
      }
    }

    return tokens;
  }

  private buildRegelToken(track: JugendRegelTrackKey, level: number): string {
    return `${track}_${level}`;
  }

  private getRegelForLevel(track: JugendRegelTrackKey, level: number): IJugendLevelRegel | undefined {
    return this.jugendRegelKonfiguration.regeln?.[track]?.[String(level) as '1' | '2' | '3' | '4' | '5'];
  }

  private speichereJugendAusbildung(mitglied: IMitglied): Observable<unknown> {
    const existingAusbildung = this.getAusbildungByMitglied(mitglied);
    const erprobungLevel = this.formMitglied.controls.erprobung_level.value;
    const erprobungDatum = this.formMitglied.controls.erprobung_datum.value;
    const wissentestLevel = this.formMitglied.controls.wissentest_level.value;
    const wissentestDatum = this.formMitglied.controls.wissentest_datum.value;
    const melderLevel = this.formMitglied.controls.fertigkeit_melder_level.value;
    const melderDatum = this.formMitglied.controls.fertigkeit_melder_datum.value;
    const fwTechnikLevel = this.formMitglied.controls.fertigkeit_fwtechnik_level.value;
    const fwTechnikDatum = this.formMitglied.controls.fertigkeit_fwtechnik_datum.value;
    const sicherZuWasserLevel = this.formMitglied.controls.fertigkeit_sicher_zu_wasser_level.value;
    const sicherZuWasserDatum = this.formMitglied.controls.fertigkeit_sicher_zu_wasser_datum.value;

    const hatIrgendeinLevel =
      erprobungLevel > 0
      || wissentestLevel > 0
      || melderLevel > 0
      || fwTechnikLevel > 0
      || sicherZuWasserLevel > 0;

    if (!existingAusbildung && !hatIrgendeinLevel) {
      return of(null);
    }

    const payload: Record<string, unknown> = {
      mitglied: mitglied.pkid,
      ...this.baueErprobungOderWissentestPayload('erprobung', erprobungLevel, erprobungDatum, existingAusbildung),
      ...this.baueErprobungOderWissentestPayload('wissentest', wissentestLevel, wissentestDatum, existingAusbildung),
      ...this.baueFertigkeitsabzeichenPayload(
        'melder_spiel_datum',
        'melder_datum',
        melderLevel,
        melderDatum,
        existingAusbildung,
      ),
      ...this.baueFertigkeitsabzeichenPayload(
        'fwtechnik_spiel_datum',
        'fwtechnik_datum',
        fwTechnikLevel,
        fwTechnikDatum,
        existingAusbildung,
      ),
      ...this.baueFertigkeitsabzeichenPayload(
        'sicher_zu_wasser_spiel_datum',
        'sicher_zu_wasser_datum',
        sicherZuWasserLevel,
        sicherZuWasserDatum,
        existingAusbildung,
      ),
    };

    if (existingAusbildung?.id) {
      return this.apiHttpService.patch('jugend/ausbildung', existingAusbildung.id, payload, false);
    }

    return this.apiHttpService.post('jugend/ausbildung', payload, false);
  }

  private baueErprobungOderWissentestPayload(
    prefix: 'erprobung' | 'wissentest',
    level: number,
    selectedDate: string,
    existingAusbildung: IJugendAusbildung | undefined,
  ): Record<string, boolean | string | null> {
    const payload: Record<string, boolean | string | null> = {};
    const defaultDate = this.toIsoDateOrFallback(selectedDate, this.heuteIsoDatum());
    const boundedLevel = Math.max(0, Math.min(level, 5));

    for (let index = 1; index <= 5; index += 1) {
      const levelField = `${prefix}_lv${index}`;
      const dateField = `${prefix}_lv${index}_datum`;
      const aktiv = index <= boundedLevel;

      payload[levelField] = aktiv;
      if (aktiv) {
        const existingDate = existingAusbildung?.[dateField as keyof IJugendAusbildung];
        payload[dateField] = typeof existingDate === 'string' ? existingDate : defaultDate;
      } else {
        payload[dateField] = null;
      }
    }

    return payload;
  }

  private baueFertigkeitsabzeichenPayload(
    spielField: IJugendFertigkeitsDatumKey,
    abzeichenField: IJugendFertigkeitsDatumKey,
    level: number,
    selectedDate: string,
    existingAusbildung: IJugendAusbildung | undefined,
  ): Record<string, string | null> {
    const payload: Record<string, string | null> = {};
    const defaultDate = this.toIsoDateOrFallback(selectedDate, this.heuteIsoDatum());
    const boundedLevel = Math.max(0, Math.min(level, 2));

    if (boundedLevel === 0) {
      payload[spielField] = null;
      payload[abzeichenField] = null;
      return payload;
    }

    const existingSpiel = existingAusbildung?.[spielField];
    payload[spielField] = typeof existingSpiel === 'string' ? existingSpiel : defaultDate;

    if (boundedLevel >= 2) {
      const existingAbzeichen = existingAusbildung?.[abzeichenField];
      payload[abzeichenField] = typeof existingAbzeichen === 'string' ? existingAbzeichen : defaultDate;
    } else {
      payload[abzeichenField] = null;
    }

    return payload;
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

  private getFertigkeitsabzeichenLevelValue(
    ausbildung: IJugendAusbildung | undefined,
    spielField: IJugendFertigkeitsDatumKey,
    abzeichenField: IJugendFertigkeitsDatumKey,
  ): number {
    if (!ausbildung) return 0;
    if (ausbildung[abzeichenField]) return 2;
    if (ausbildung[spielField]) return 1;
    return 0;
  }

  private getErprobungLevelDatumValue(ausbildung: IJugendAusbildung | undefined): string {
    return this.getPrefixLevelDatumValue(ausbildung, 'erprobung', this.getErprobungLevelValue(ausbildung));
  }

  private getWissentestLevelDatumValue(ausbildung: IJugendAusbildung | undefined): string {
    return this.getPrefixLevelDatumValue(ausbildung, 'wissentest', this.getWissentestLevelValue(ausbildung));
  }

  private getPrefixLevelDatumValue(
    ausbildung: IJugendAusbildung | undefined,
    prefix: 'erprobung' | 'wissentest',
    level: number,
  ): string {
    if (!ausbildung || level <= 0) {
      return '';
    }

    for (let currentLevel = level; currentLevel >= 1; currentLevel -= 1) {
      const key = `${prefix}_lv${currentLevel}_datum` as keyof IJugendAusbildung;
      const datum = ausbildung[key];
      if (typeof datum === 'string') {
        return this.toIsoDateOrFallback(datum, '');
      }
    }

    return '';
  }

  private getFertigkeitsabzeichenDatumValue(
    ausbildung: IJugendAusbildung | undefined,
    spielField: IJugendFertigkeitsDatumKey,
    abzeichenField: IJugendFertigkeitsDatumKey,
  ): string {
    if (!ausbildung) {
      return '';
    }

    const abzeichen = ausbildung[abzeichenField];
    if (typeof abzeichen === 'string') {
      return this.toIsoDateOrFallback(abzeichen, '');
    }

    const spiel = ausbildung[spielField];
    if (typeof spiel === 'string') {
      return this.toIsoDateOrFallback(spiel, '');
    }

    return '';
  }

  private heuteIsoDatum(): string {
    return new Date().toISOString().slice(0, 10);
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
