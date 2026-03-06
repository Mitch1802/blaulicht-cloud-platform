import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { HeaderComponent } from '../_template/header/header.component';
import { GlobalDataService } from '../_service/global-data.service';
import { IMitglied } from '../_interface/mitglied';
import { IJugendEvent } from '../_interface/jugend_event';
import { IJugendAusbildung } from '../_interface/jugend_ausbildung';

type JugendEventKategorie =
  | 'WISSENSTEST'
  | 'ERPROBUNG'
  | 'FWTECHNIK'
  | 'MELDER'
  | 'SICHER_ZU_WASSER'
  | 'SONSTIGES';

interface IEventKategorieOption {
  value: JugendEventKategorie;
  label: string;
}

interface IEventTeilnehmerLevelInput {
  pkid: number;
  level: number | null;
}

@Component({
  selector: 'app-jugend',
  standalone: true,
  imports: [
    HeaderComponent,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
  ],
  templateUrl: './jugend.component.html',
  styleUrl: './jugend.component.sass'
})
export class JugendComponent implements OnInit {
  private globalDataService = inject(GlobalDataService);

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

  sichtbareSpaltenJugend: string[] = ['stbnr', 'name', 'status', 'abzeichen', 'ausbildung', 'alter', 'ueberstellung', 'actions'];
  sichtbareSpaltenEvents: string[] = ['datum', 'kategorie', 'titel', 'teilnehmer', 'actions'];

  readonly eventKategorien: ReadonlyArray<IEventKategorieOption> = [
    { value: 'WISSENSTEST', label: 'Wissentest' },
    { value: 'ERPROBUNG', label: 'Erprobung' },
    { value: 'FWTECHNIK', label: 'FW-Technik' },
    { value: 'MELDER', label: 'Melder' },
    { value: 'SICHER_ZU_WASSER', label: 'Sicher zu Wasser' },
    { value: 'SONSTIGES', label: 'Sonstiges' },
  ];

  private readonly levelPflichtKategorien = new Set<JugendEventKategorie>([
    'WISSENSTEST',
    'ERPROBUNG',
  ]);

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

  showMitgliedForm = false;
  showEventForm = false;

  formMitglied = new FormGroup({
    id: new FormControl<string>(''),
    dienststatus: new FormControl<'JUGEND' | 'AKTIV'>('JUGEND', { nonNullable: true }),
  });

  formEvent = new FormGroup({
    id: new FormControl<string>(''),
    titel: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    datum: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    ort: new FormControl<string>('', { nonNullable: true }),
    kategorie: new FormControl<JugendEventKategorie | ''>('', { nonNullable: true, validators: [Validators.required] }),
    teilnehmer_ids: new FormControl<number[]>([], { nonNullable: true }),
  });

  ngOnInit(): void {
    sessionStorage.setItem('PageNumber', '2');
    sessionStorage.setItem('Page2', 'JUGEND');
    this.breadcrumb = this.globalDataService.ladeBreadcrumb();

    this.loadMitglieder();
    this.loadAusbildung();
    this.loadEvents();
  }

  loadMitglieder(): void {
    this.globalDataService.get<IMitglied[]>('mitglieder').subscribe({
      next: (erg) => {
        this.mitglieder = this.globalDataService.arraySortByKey(erg, 'stbnr');
        this.jugendMitglieder = this.mitglieder.filter((m) => this.normalizeStatus(m.dienststatus) === 'JUGEND');
        this.dataSourceJugend.data = this.jugendMitglieder;
      },
      error: (error) => this.globalDataService.errorAnzeigen(error),
    });
  }

  loadEvents(): void {
    this.globalDataService.get<IJugendEvent[]>('jugend/events').subscribe({
      next: (erg) => {
        this.events = erg;
        this.dataSourceEvents.data = erg;
      },
      error: (error) => this.globalDataService.errorAnzeigen(error),
    });
  }

  loadAusbildung(): void {
    this.globalDataService.get<IJugendAusbildung[]>('jugend/ausbildung').subscribe({
      next: (erg) => {
        this.jugendAusbildungen = erg;
        this.ausbildungByMitgliedPkid = new Map<number, IJugendAusbildung>(
          erg.map((item) => [item.mitglied, item]),
        );
      },
      error: (error) => this.globalDataService.errorAnzeigen(error),
    });
  }

  editMitglied(element: IMitglied): void {
    this.showMitgliedForm = true;
    this.selectedMitglied = element;
    this.formMitglied.setValue({
      id: element.id,
      dienststatus: this.normalizeStatus(element.dienststatus),
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

    this.onEventTeilnehmerAuswahlGeaendert();
  }

  speichernMitglied(): void {
    const id = this.formMitglied.controls.id.value;
    if (!id) {
      return;
    }

    const payload = {
      dienststatus: this.formMitglied.controls.dienststatus.value,
    };

    this.globalDataService.patch('mitglieder', id, payload, false).subscribe({
      next: () => {
        this.globalDataService.erstelleMessage('success', 'Jugend-Mitglied aktualisiert.');
        this.showMitgliedForm = false;
        this.selectedMitglied = null;
        this.loadMitglieder();
      },
      error: (error) => this.globalDataService.errorAnzeigen(error),
    });
  }

  speichernEvent(): void {
    if (this.formEvent.invalid) {
      this.globalDataService.erstelleMessage('error', 'Bitte Titel, Datum und Thema ausfüllen.');
      return;
    }

    const kategorie = this.formEvent.controls.kategorie.value;
    const teilnehmerIds = this.formEvent.controls.teilnehmer_ids.value;
    const teilnehmerLevels: IEventTeilnehmerLevelInput[] = teilnehmerIds.map((pkid) => ({
      pkid,
      level: this.getTeilnehmerLevel(pkid),
    }));

    if (this.isLevelPflichtKategorie(kategorie)) {
      const missingLevel = teilnehmerLevels.some((item) => item.level === null);
      if (missingLevel) {
        this.globalDataService.erstelleMessage(
          'error',
          'Für Wissentest und Erprobung muss pro Teilnehmer ein Level erfasst werden.',
        );
        return;
      }
    }

    const payload = {
      titel: this.formEvent.controls.titel.value,
      datum: this.formEvent.controls.datum.value,
      ort: this.formEvent.controls.ort.value,
      kategorie,
      teilnehmer_ids: teilnehmerIds,
      teilnehmer_levels: teilnehmerLevels,
    };

    const id = this.formEvent.controls.id.value;
    if (!id) {
      this.globalDataService.post('jugend/events', payload, false).subscribe({
        next: () => {
          this.globalDataService.erstelleMessage('success', 'Event gespeichert.');
          this.showEventForm = false;
          this.teilnehmerLevelByPkid.clear();
          this.loadEvents();
        },
        error: (error) => this.globalDataService.errorAnzeigen(error),
      });
      return;
    }

    this.globalDataService.patch('jugend/events', id, payload, false).subscribe({
      next: () => {
        this.globalDataService.erstelleMessage('success', 'Event aktualisiert.');
        this.showEventForm = false;
        this.teilnehmerLevelByPkid.clear();
        this.loadEvents();
      },
      error: (error) => this.globalDataService.errorAnzeigen(error),
    });
  }

  eventLoeschen(): void {
    const id = this.formEvent.controls.id.value;
    if (!id) {
      return;
    }
    this.globalDataService.delete('jugend/events', id).subscribe({
      next: () => {
        this.globalDataService.erstelleMessage('success', 'Event gelöscht.');
        this.showEventForm = false;
        this.teilnehmerLevelByPkid.clear();
        this.loadEvents();
      },
      error: (error) => this.globalDataService.errorAnzeigen(error),
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
  }

  getAusgewaehlteEventMitglieder(): IMitglied[] {
    const selectedIds = new Set(this.formEvent.controls.teilnehmer_ids.value);
    return this.jugendMitglieder.filter((mitglied) => selectedIds.has(mitglied.pkid));
  }

  getTeilnehmerLevel(pkid: number): number | null {
    return this.teilnehmerLevelByPkid.get(pkid) ?? null;
  }

  setTeilnehmerLevel(pkid: number, level: number | null): void {
    this.teilnehmerLevelByPkid.set(pkid, level);
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
    const ausbildung = this.getAusbildungByMitglied(m);
    if (!ausbildung) {
      return '-';
    }

    if (ausbildung.erprobung_lv5) return 'Level 5';
    if (ausbildung.erprobung_lv4) return 'Level 4';
    if (ausbildung.erprobung_lv3) return 'Level 3';
    if (ausbildung.erprobung_lv2) return 'Level 2';
    if (ausbildung.erprobung_lv1) return 'Level 1';

    return '-';
  }

  getWissentestLevelText(m: IMitglied): string {
    const ausbildung = this.getAusbildungByMitglied(m);
    if (!ausbildung) {
      return '-';
    }

    if (ausbildung.wissentest_lv5) return 'Level 5';
    if (ausbildung.wissentest_lv4) return 'Level 4';
    if (ausbildung.wissentest_lv3) return 'Level 3';
    if (ausbildung.wissentest_lv2) return 'Level 2';
    if (ausbildung.wissentest_lv1) return 'Level 1';

    return '-';
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
      return 'Spätestens jetzt überstellen';
    }
    if (age >= 15) {
      return 'Kann in Aktivstand überstellt werden';
    }
    return 'Noch im Jugendstand';
  }

  getEventTeilnehmerText(event: IJugendEvent): string {
    const teilnehmer = event.teilnehmer ?? [];
    if (teilnehmer.length === 0) {
      return '-';
    }
    return teilnehmer
      .map((m) => {
        const levelText = m.level != null ? ` - Level ${m.level}` : '';
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

  private parseEventKategorie(value: string | undefined): JugendEventKategorie | '' {
    const normalized = String(value ?? '').trim().toUpperCase();
    if (normalized === 'WISSENSTEST') return 'WISSENSTEST';
    if (normalized === 'ERPROBUNG') return 'ERPROBUNG';
    if (normalized === 'FWTECHNIK') return 'FWTECHNIK';
    if (normalized === 'MELDER') return 'MELDER';
    if (normalized === 'SICHER_ZU_WASSER') return 'SICHER_ZU_WASSER';
    if (normalized === 'SONSTIGES') return 'SONSTIGES';
    return '';
  }

  private getKategorieLabel(kategorie: JugendEventKategorie | ''): string {
    const option = this.eventKategorien.find((item) => item.value === kategorie);
    return option ? option.label : '-';
  }

  private normalizeStatus(value: string | undefined): 'JUGEND' | 'AKTIV' {
    return String(value ?? 'AKTIV').toUpperCase() === 'JUGEND' ? 'JUGEND' : 'AKTIV';
  }

  private getAusbildungByMitglied(mitglied: IMitglied): IJugendAusbildung | undefined {
    return this.ausbildungByMitgliedPkid.get(mitglied.pkid);
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
