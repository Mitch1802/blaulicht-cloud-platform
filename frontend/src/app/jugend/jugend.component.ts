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
  events: IJugendEvent[] = [];

  dataSourceJugend = new MatTableDataSource<IMitglied>([]);
  dataSourceEvents = new MatTableDataSource<IJugendEvent>([]);

  sichtbareSpaltenJugend: string[] = ['stbnr', 'name', 'alter', 'ueberstellung', 'actions'];
  sichtbareSpaltenEvents: string[] = ['datum', 'titel', 'teilnehmer', 'actions'];

  showMitgliedForm = false;
  showEventForm = false;

  formMitglied = new FormGroup({
    id: new FormControl<string>(''),
    dienststatus: new FormControl<'JUGEND' | 'AKTIV'>('JUGEND', { nonNullable: true }),
    jugend_wissentest: new FormControl<string>(''),
    jugend_erprobung: new FormControl<string>(''),
    jugend_fertigkeitsabzeichen: new FormControl<string>(''),
    jugend_bewerb: new FormControl<string>(''),
  });

  formEvent = new FormGroup({
    id: new FormControl<string>(''),
    titel: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    datum: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    notiz: new FormControl<string>('', { nonNullable: true }),
    teilnehmer_ids: new FormControl<number[]>([], { nonNullable: true }),
  });

  ngOnInit(): void {
    sessionStorage.setItem('PageNumber', '2');
    sessionStorage.setItem('Page2', 'JUGEND');
    this.breadcrumb = this.globalDataService.ladeBreadcrumb();

    this.loadMitglieder();
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
    this.globalDataService.get<IJugendEvent[]>('mitglieder/jugend-events').subscribe({
      next: (erg) => {
        this.events = erg;
        this.dataSourceEvents.data = erg;
      },
      error: (error) => this.globalDataService.errorAnzeigen(error),
    });
  }

  editMitglied(element: IMitglied): void {
    this.showMitgliedForm = true;
    this.formMitglied.setValue({
      id: element.id,
      dienststatus: this.normalizeStatus(element.dienststatus),
      jugend_wissentest: element.jugend_wissentest ?? '',
      jugend_erprobung: element.jugend_erprobung ?? '',
      jugend_fertigkeitsabzeichen: element.jugend_fertigkeitsabzeichen ?? '',
      jugend_bewerb: element.jugend_bewerb ?? '',
    });
  }

  neuesEvent(): void {
    this.showEventForm = true;
    this.formEvent.reset({
      id: '',
      titel: '',
      datum: '',
      notiz: '',
      teilnehmer_ids: [],
    });
  }

  editEvent(event: IJugendEvent): void {
    this.showEventForm = true;
    this.formEvent.setValue({
      id: event.id,
      titel: event.titel,
      datum: event.datum,
      notiz: event.notiz ?? '',
      teilnehmer_ids: (event.teilnehmer ?? []).map((m) => m.pkid),
    });
  }

  speichernMitglied(): void {
    const id = this.formMitglied.controls.id.value;
    if (!id) {
      return;
    }

    const payload = {
      dienststatus: this.formMitglied.controls.dienststatus.value,
      jugend_wissentest: this.formMitglied.controls.jugend_wissentest.value || '',
      jugend_erprobung: this.formMitglied.controls.jugend_erprobung.value || '',
      jugend_fertigkeitsabzeichen: this.formMitglied.controls.jugend_fertigkeitsabzeichen.value || '',
      jugend_bewerb: this.formMitglied.controls.jugend_bewerb.value || '',
    };

    this.globalDataService.patch('mitglieder', id, payload, false).subscribe({
      next: () => {
        this.globalDataService.erstelleMessage('success', 'Jugend-Mitglied aktualisiert.');
        this.showMitgliedForm = false;
        this.loadMitglieder();
      },
      error: (error) => this.globalDataService.errorAnzeigen(error),
    });
  }

  speichernEvent(): void {
    if (this.formEvent.invalid) {
      this.globalDataService.erstelleMessage('error', 'Bitte Titel und Datum ausfüllen.');
      return;
    }

    const payload = {
      titel: this.formEvent.controls.titel.value,
      datum: this.formEvent.controls.datum.value,
      notiz: this.formEvent.controls.notiz.value,
      teilnehmer_ids: this.formEvent.controls.teilnehmer_ids.value,
    };

    const id = this.formEvent.controls.id.value;
    if (!id) {
      this.globalDataService.post('mitglieder/jugend-events', payload, false).subscribe({
        next: () => {
          this.globalDataService.erstelleMessage('success', 'Event gespeichert.');
          this.showEventForm = false;
          this.loadEvents();
        },
        error: (error) => this.globalDataService.errorAnzeigen(error),
      });
      return;
    }

    this.globalDataService.patch('mitglieder/jugend-events', id, payload, false).subscribe({
      next: () => {
        this.globalDataService.erstelleMessage('success', 'Event aktualisiert.');
        this.showEventForm = false;
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
    this.globalDataService.delete('mitglieder/jugend-events', id).subscribe({
      next: () => {
        this.globalDataService.erstelleMessage('success', 'Event gelöscht.');
        this.showEventForm = false;
        this.loadEvents();
      },
      error: (error) => this.globalDataService.errorAnzeigen(error),
    });
  }

  mitgliedFormAbbrechen(): void {
    this.showMitgliedForm = false;
  }

  eventFormAbbrechen(): void {
    this.showEventForm = false;
  }

  getVollerName(m: IMitglied): string {
    return `${m.vorname} ${m.nachname}`;
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
    return teilnehmer.map((m) => `${m.stbnr} ${m.vorname} ${m.nachname}`).join(', ');
  }

  private normalizeStatus(value: string | undefined): 'JUGEND' | 'AKTIV' {
    return String(value ?? 'AKTIV').toUpperCase() === 'JUGEND' ? 'JUGEND' : 'AKTIV';
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
