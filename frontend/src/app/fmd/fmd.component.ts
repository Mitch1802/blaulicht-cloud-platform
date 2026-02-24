import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ViewChild, inject, QueryList, ViewChildren } from '@angular/core';
import { IMitglied } from 'src/app/_interface/mitglied';
import { GlobalDataService } from 'src/app/_service/global-data.service';
import { HeaderComponent } from '../_template/header/header.component';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';

import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { IATSTraeger } from '../_interface/atstraeger';
import { BaseChartDirective } from 'ng2-charts';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Chart, ChartData, ChartOptions } from 'chart.js';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { IStammdaten } from '../_interface/stammdaten';
import { forkJoin } from 'rxjs';

Chart.register(ChartDataLabels);

@Component({
  selector: 'app-fmd',
  imports: [
    HeaderComponent,
    MatCardModule,
    MatTabsModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatButton,
    MatInput,
    MatError,
    MatTableModule,
    BaseChartDirective,
    MatIconModule,
    MatSortModule,
    MatPaginatorModule
  ],
  templateUrl: './fmd.component.html',
  styleUrl: './fmd.component.sass'
})

export class FmdComponent implements OnInit, AfterViewInit {
  globalDataService = inject(GlobalDataService);
  router = inject(Router);
  cd = inject(ChangeDetectorRef)

  title = "FMD";
  modul = "fmd";

  mitglieder: IMitglied[] = [];
  mitgliederGesamt: IMitglied[] = [];
  atstraeger: IATSTraeger[] = [];
  currentYear = new Date().getFullYear();
  activeTabIndex = 0;

  private readonly tabsMitTabelle = new Set<number>([1, 2, 3, 4]);
  private readonly sortIndexByTab: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3 };

  get freieMitglieder(): IMitglied[] {
    return this.mitglieder.filter(m =>
      !this.atstraeger.some(a => a.mitglied_id === m.pkid)
    );
  }

  get dropdownMitglieder(): IMitglied[] {
    const frei = this.freieMitglieder;
    const currentId = this.formModul.controls['mitglied_id'].value as number;
    let liste: IMitglied[];

    if (Number(currentId)) {
      const aktuell = this.mitglieder.find(m => m.pkid === Number(currentId));
      if (aktuell && !frei.some(m => m.pkid === Number(currentId))) {
        liste = [aktuell, ...frei];
      } else {
        liste = frei;
      }
    } else {
      liste = frei;
    }

    return this.globalDataService.arraySortByKey(liste, 'stbnr');
  }

  breadcrumb: any = [];

  pageOptions: any[] = [5, 10, 50, 100]

  dataSource = new MatTableDataSource<IATSTraeger>(this.atstraeger);
  sichtbareSpaltenATS: string[] = ['stbnr', 'vorname', 'nachname', 'actions'];
  sichtbareSpaltenUntersuchung: string[] = ['stbnr', 'vorname', 'nachname', 'letzte_untersuchung', 'naechste_untersuchung'];
  sichtbareSpaltenLeistungstest: string[] = ['stbnr', 'vorname', 'nachname', 'leistungstest', 'leistungstest_art'];
  sichtbareSpaltenTauglichkeit: string[] = ['stbnr', 'vorname', 'nachname', 'tauglichkeit'];

  columnsByTab: string[][] = [
    [], // Übersicht
    this.sichtbareSpaltenATS,
    this.sichtbareSpaltenUntersuchung,
    this.sichtbareSpaltenLeistungstest,
    this.sichtbareSpaltenTauglichkeit
  ];

  public pieChartType: 'doughnut' = 'doughnut';
  public pieChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    plugins: {
      datalabels: {
        color: '#000',
        font: {
          weight: 'bold',
          size: 14
        },
        formatter: (value, ctx) => {
          return value;
        }
      }
    }
  };

  chartAlter: ChartData<'doughnut', number[], string | string[]> = {
    labels: ['16-18', '19-39', '40-54', '55-65'],
    datasets: [{ data: [0, 0, 0, 0], backgroundColor: ['#69c7a8', '#c973c4', '#d6b36d', '#cfc95d'] }]
  };

  chartTauglichkeit: ChartData<'doughnut', number[], string | string[]> = {
    labels: ['tauglich', 'kein Leistungstest', 'kein Arzt'],
    datasets: [{ data: [0, 0, 0], backgroundColor: ['#32a852', '#fcba56', '#bf6763'] }]
  };

  chartUntersuchung: ChartData<'doughnut', number[], string | string[]> = {
    labels: ['kein Arzt', 'gültig'],
    datasets: [{ data: [0, 0], backgroundColor: ['#bf6763', '#32a852'] }]
  };

  formModul = new FormGroup({
    id: new FormControl(''),
    mitglied_id: new FormControl(0),
    arzt: new FormControl(''),
    arzt_typ: new FormControl(''),
    letzte_untersuchung: new FormControl('', [
      Validators.pattern(/^([0-3]\d)\.([0-1]\d)\.(\d{4})$/),
      this.validDateDDMMYYYY()
    ]),
    leistungstest: new FormControl(''),
    leistungstest_art: new FormControl(''),
    notizen: new FormControl(''),
    fdisk_aenderung: new FormControl('', [
      Validators.pattern(/^([0-3]\d)\.([0-1]\d)\.(\d{4})$/),
      this.validDateDDMMYYYY()
    ]),
  });

  arzttypen: any = [
    "Praktischer Arzt",
    "FW Arzt",
    "Betriebsarzt"
  ]

  leistungstestarten: any = [
    "unbekannt",
    "Finnentest",
    "Fahrrad",
    "Cooper (Laufen)"
  ]

  modul_konfig: any = {};
  pdf_konfig: any = {};
  stammdaten: any = {};

  @ViewChildren(BaseChartDirective) charts?: QueryList<BaseChartDirective>;
  @ViewChild(MatPaginator, { static: false }) paginator?: MatPaginator;
  @ViewChildren(MatSort) sorts?: QueryList<MatSort>;

  ngAfterViewInit() {
    if (this.hasTable(this.activeTabIndex) && this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    this.setActiveSortForTab(this.activeTabIndex);
    this.updateFilterPredicateFor(this.activeTabIndex);
    this.triggerAllChartsUpdate();
  }

  hasTable(index: number): boolean {
    return this.tabsMitTabelle.has(index);
  }

  ngOnInit(): void {
    sessionStorage.setItem("PageNumber", "2");
    sessionStorage.setItem("Page2", "FMD");
    this.breadcrumb = this.globalDataService.ladeBreadcrumb();
    this.formModul.disable();

    forkJoin({
      main: this.globalDataService.get<any[]>(this.modul),
      context: this.globalDataService.get<any>(`${this.modul}/context`),
    }).subscribe({
      next: ({ main, context }) => {
        try {
          const konfigs = context.modul_konfig.find((m: any) => m.modul === 'fmd');
          this.modul_konfig = konfigs?.konfiguration ?? [];
          
          const templates = context.modul_konfig.find((m: any) => m.modul === 'pdf');
          this.pdf_konfig = templates?.konfiguration ?? [];

          this.stammdaten = <IStammdaten>context.konfig[0];

          const mains = main as any[];
          this.mitglieder = context.mitglieder as any[];
          this.mitgliederGesamt = context.mitglieder as any[];
          const memberMap = new Map<number, any>(this.mitglieder.map((m: any) => [m.pkid, m]));

          this.atstraeger = mains.map(item => {
            const mitg = memberMap.get(item.mitglied_id) || {};
            return {
              ...item,
              stbnr: mitg.stbnr,
              vorname: mitg.vorname,
              nachname: mitg.nachname,
              geburtsdatum: mitg.geburtsdatum,
              hauptberuflich: mitg.hauptberuflich
            };
          });

          this.mitglieder = this.mitglieder.filter((m: any) => m.hauptberuflich == false);

          this.mitglieder = this.globalDataService.arraySortByKey(this.mitglieder, 'stbnr');
          this.atstraeger = this.globalDataService.arraySortByKey(this.atstraeger, 'stbnr');
          this.dataSource.data = this.atstraeger;
          this.updateTauglichkeitFürAlle();
          this.updateChartData();
        } catch (e: any) {
          this.globalDataService.erstelleMessage("error", e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      }
    });
  }

  applyFilter(value: string): void {
    this.dataSource.filter = (value || '').trim().toLowerCase();
    this.paginator?.firstPage();
  }

  neueDetails(): void {
    this.formModul.enable();
  }

  auswahlBearbeiten(element: any): void {
    if (element.id === 0) {
      return;
    }
    const abfrageUrl = `${this.modul}/${element.id}`;

    this.globalDataService.get(abfrageUrl).subscribe({
      next: (erg: any) => {
        try {
          const details: IATSTraeger = erg;

          this.formModul.enable();
          this.formModul.setValue({
            id: details.id,
            mitglied_id: details.mitglied_id,
            arzt: details.arzt,
            arzt_typ: details.arzt_typ,
            letzte_untersuchung: details.letzte_untersuchung,
            leistungstest: details.leistungstest,
            leistungstest_art: details.leistungstest_art,
            notizen: details.notizen,
            fdisk_aenderung: details.fdisk_aenderung
          });
        } catch (e: any) {
          this.globalDataService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      }
    });
  }

  datenSpeichern(): void {
    if (this.formModul.invalid) {
      this.globalDataService.erstelleMessage('error', 'Bitte alle Pflichtfelder korrekt ausfüllen!');
      return;
    }

    const objekt: any = this.formModul.value;
    const idValue = this.formModul.controls['id'].value;

    const mitglied = this.mitglieder.find(m => m.pkid === objekt.mitglied_id);
    const gebDatum = mitglied?.geburtsdatum ?? null;
    const alter = this.berechneAlter(gebDatum);

    if (objekt.letzte_untersuchung != '' && objekt.letzte_untersuchung != null) {
      const parts = objekt.letzte_untersuchung.split('.');
      if (parts.length === 3) {
        const [tag, monat, jahr] = parts.map((n: any) => parseInt(n, 10));
        if (!isNaN(tag) && !isNaN(monat) && !isNaN(jahr)) {
          const datum = new Date(jahr, monat - 1, tag);

          const match = this.modul_konfig.intervall
            .find((i: any) => alter >= i.von && alter <= i.bis);

          if (match) {
            const nextYear = datum.getFullYear() + match.intervall;
            objekt.naechste_untersuchung = nextYear.toString();
          } else {
            objekt.naechste_untersuchung = '';
          }
        }
      }
    } else {
      objekt.naechste_untersuchung = '';
    }

    const currentYear = new Date().getFullYear();
    let testJahr: number | null = null;
    if (objekt.leistungstest) {
      const partsLS = objekt.leistungstest.split('.');
      if (partsLS.length === 3) {
        const [, , jahrLS] = partsLS.map((n: any) => parseInt(n, 10));
        if (!isNaN(jahrLS)) testJahr = jahrLS;
      }
    }

    const nextYearNum = Number(objekt.naechste_untersuchung);

    if (
      objekt.letzte_untersuchung !== '' &&
      objekt.leistungstest !== '' &&
      !isNaN(nextYearNum) &&
      nextYearNum > currentYear &&
      testJahr !== null &&
      testJahr >= currentYear - 1
    ) {
      objekt.tauglichkeit = 'tauglich';
    } else {
      objekt.tauglichkeit = 'nein';
    }


    if (!idValue) {
      this.globalDataService.post(this.modul, objekt, false).subscribe({
        next: (erg: any) => {
          try {
            const newTraeger: any = erg;
            const mitg = this.mitglieder.find(m => m.pkid === newTraeger.mitglied_id);

            if (mitg) {
              newTraeger.stbnr = mitg.stbnr;
              newTraeger.vorname = mitg.vorname;
              newTraeger.nachname = mitg.nachname;
              newTraeger.hauptberuflich = mitg.hauptberuflich;
            }

            this.atstraeger.push(newTraeger);
            this.atstraeger = this.globalDataService.arraySortByKey(this.atstraeger, 'stbnr');
            this.dataSource.data = this.atstraeger;
            this.updateChartData();

            this.formModul.reset({
              id: '',
              mitglied_id: 0,
              arzt: '',
              arzt_typ: '',
              letzte_untersuchung: '',
              leistungstest: '',
              leistungstest_art: '',
              notizen: '',
              fdisk_aenderung: ''
            });
            this.formModul.disable();
            this.globalDataService.erstelleMessage('success', 'ATS Träger gespeichert!');
          } catch (e: any) {
            this.globalDataService.erstelleMessage('error', e);
          }
        },
        error: (error: any) => this.globalDataService.errorAnzeigen(error)
      });
    } else {
      this.globalDataService.patch(this.modul, idValue, objekt, false).subscribe({
        next: (erg: any) => {
          try {
            const updated: any = erg;
            const mitg = this.mitglieder.find(m => m.pkid === updated.mitglied_id);
            if (mitg) {
              updated.stbnr = mitg.stbnr;
              updated.vorname = mitg.vorname;
              updated.nachname = mitg.nachname;
              updated.hauptberuflich = mitg.hauptberuflich;
            }
            this.atstraeger = this.atstraeger
              .map(m => m.id === updated.id ? updated : m)
              .sort((a, b) => a.stbnr - b.stbnr);

            this.dataSource.data = this.atstraeger;

            this.formModul.reset({
              id: '',
              mitglied_id: 0,
              arzt: '',
              arzt_typ: '',
              letzte_untersuchung: '',
              leistungstest: '',
              leistungstest_art: '',
              notizen: '',
              fdisk_aenderung: ''
            });
            this.formModul.disable();
            this.updateChartData();

            this.globalDataService.erstelleMessage('success', 'ATS Träger geändert!');
          } catch (e: any) {
            this.globalDataService.erstelleMessage('error', e);
          }
        },
        error: (error: any) => this.globalDataService.errorAnzeigen(error)
      });
    }
  }

  abbrechen(): void {
    this.globalDataService.erstelleMessage("info", "ATS Träger nicht gespeichert!");
    this.formModul.reset({
      id: '',
      mitglied_id: 0,
      arzt: '',
      arzt_typ: '',
      letzte_untersuchung: '',
      leistungstest: '',
      leistungstest_art: '',
      notizen: '',
      fdisk_aenderung: ''
    });
    this.formModul.disable();
  }

  datenLoeschen(): void {
    const id = this.formModul.controls['id'].value!;
    if (!id) {
      this.globalDataService.erstelleMessage('error', 'Kein ATS Träger ausgewählt zum Löschen!');
      return;
    }

    this.globalDataService.delete(this.modul, id).subscribe({
      next: (erg: any) => {
        try {
          this.atstraeger = this.atstraeger.filter((m: any) => m.id !== id);
          this.dataSource.data = this.atstraeger;
          this.updateChartData();

          this.formModul.reset({
            id: '',
            mitglied_id: 0,
            arzt: '',
            arzt_typ: '',
            letzte_untersuchung: '',
            leistungstest: '',
            leistungstest_art: '',
            notizen: '',
            fdisk_aenderung: ''
          });
          this.formModul.disable();

          this.globalDataService.erstelleMessage('success', 'ATS Träger erfolgreich gelöscht!');
        } catch (e: any) {
          this.globalDataService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      }
    });
  }

  validDateDDMMYYYY(): ValidatorFn {
    return (control: AbstractControl) => {
      const v: string = control.value;
      if (!v || !/^([0-3]\d)\.([0-1]\d)\.(\d{4})$/.test(v)) {
        return null;
      }
      const [t, m, j] = v.split('.').map(x => +x);
      const d = new Date(j, m - 1, t);
      return (d.getFullYear() === j && d.getMonth() === m - 1 && d.getDate() === t)
        ? null
        : { dateInvalid: true };
    };
  }

  berechneAlter(geburtsdatum?: string | Date | null): number {
    if (!geburtsdatum) {
      return 0;
    }

    let geb: Date;
    if (typeof geburtsdatum === 'string') {
      const parts = geburtsdatum.split('.');
      if (parts.length !== 3) {
        return 0;
      }
      const [t, m, j] = parts.map(n => parseInt(n, 10));
      geb = new Date(j, m - 1, t);
      if (isNaN(geb.getTime())) {
        return 0;
      }
    } else {
      geb = geburtsdatum;
    }
    const today = new Date();
    let age = today.getFullYear() - geb.getFullYear();
    const monDiff = today.getMonth() - geb.getMonth();
    const dayDiff = today.getDate() - geb.getDate();
    if (monDiff < 0 || (monDiff === 0 && dayDiff < 0)) {
      age--;
    }
    return age;
  }

  updateTauglichkeitFürAlle(): void {
    const currentYear = new Date().getFullYear();
    
    this.atstraeger.forEach(item => {
      const lastYear = this.getYearFromDate(item.letzte_untersuchung);
      const testYear = this.getYearFromDate(item.leistungstest);
      const nextYear = item.naechste_untersuchung
        ? parseInt(item.naechste_untersuchung, 10)
        : NaN;

      if (
        !isNaN(lastYear) &&
        !isNaN(testYear) &&
        !isNaN(nextYear) &&
        lastYear > 0 &&
        Boolean(item.leistungstest) &&
        testYear >= currentYear - 1 &&
        nextYear > currentYear
      ) {
        item.tauglichkeit = 'tauglich';
      } else {
        item.tauglichkeit = 'nein';
      }
    });
  }

  isOlderThanLastYear(dateInput?: string | Date | null): boolean {
    const year = this.getYearFromDate(dateInput);
    if (isNaN(year)) return false;
    const currentYear = new Date().getFullYear();
    return year < currentYear - 1;
  }

  getYearFromDate(dateStr?: string | Date | null): number {
    if (!dateStr) return NaN;

    if (dateStr instanceof Date) return dateStr.getFullYear();

    const s = String(dateStr).trim();

    // dd.mm.yyyy
    const parts = s.split('.');
    if (parts.length === 3) return parseInt(parts[2], 10);

    // ISO yyyy-mm-dd...
    const m = s.match(/^(\d{4})-/);
    if (m) return parseInt(m[1], 10);

    return NaN;
  }

  updateChartData(): void {
    this.updateAlterChart();
    this.updateTauglichkeitChart();
    this.updateUntersuchungChart();
  }

  private triggerAllChartsUpdate() {
    this.cd.detectChanges();
    queueMicrotask(() => this.charts?.forEach(c => c.update()));
  }

  private setActiveSortForTab(tabIndex: number): void {
    const sortIdx = this.sortIndexByTab[tabIndex];
    const activeSort = sortIdx !== undefined ? this.sorts?.get(sortIdx) : undefined;
    this.dataSource.sort = (activeSort as MatSort | undefined) ?? (undefined as any);
  }

  updateAlterChart(): void {
    const zaehler = [0, 0, 0, 0];

    this.atstraeger.forEach(traeger => {
      const alter = this.berechneAlter(traeger.geburtsdatum);
      if (alter >= 16 && alter <= 18) zaehler[0]++;
      else if (alter >= 19 && alter <= 39) zaehler[1]++;
      else if (alter >= 40 && alter <= 54) zaehler[2]++;
      else if (alter >= 55 && alter <= 65) zaehler[3]++;
    });

    this.chartAlter.datasets[0].data = zaehler;
    this.triggerAllChartsUpdate();
  }

  updateTauglichkeitChart(): void {
    const zaehler = [0, 0, 0];
    const currentYear = new Date().getFullYear();

    this.atstraeger.forEach(traeger => {
      const testStr = traeger.leistungstest;
      const hasTest = testStr != null && String(testStr).trim() !== '' && testStr !== 'nein';

      const nextStr = traeger.naechste_untersuchung;
      const hasNext = nextStr != null && String(nextStr).trim() !== '';
      const nextYear = hasNext ? Number(nextStr) : NaN;

      if (traeger.tauglichkeit === 'tauglich') {
        zaehler[0]++;
        return;
      }

      // "kein Arzt" / Untersuchung nicht gültig
      if (!hasNext || isNaN(nextYear) || nextYear <= currentYear) {
        zaehler[2]++;
        return;
      }

      // "kein Leistungstest" (fehlt oder zu alt)
      if (!hasTest || this.isOlderThanLastYear(testStr)) {
        zaehler[1]++;
        return;
      }

      // Fallback: wenn was durchrutscht, zählt es sinnvollerweise als "kein Leistungstest"
      zaehler[1]++;
    });

    this.chartTauglichkeit.datasets[0].data = zaehler;
    this.triggerAllChartsUpdate();
  }

  updateUntersuchungChart(): void {
    const zaehler = [0, 0];
    const currentYear = new Date().getFullYear();

    this.atstraeger.forEach(traeger => {
      const nextStr = traeger.naechste_untersuchung;
      const hasNext = nextStr != null && String(nextStr).trim() !== '';
      const nextYear = hasNext ? Number(nextStr) : NaN;

      if (!hasNext || isNaN(nextYear) || nextYear <= currentYear) {
        zaehler[0]++; // kein Arzt / ungültig / überfällig
      } else {
        zaehler[1]++; // gültig
      }
    });

    this.chartUntersuchung.datasets[0].data = zaehler;
    this.triggerAllChartsUpdate();
  }

  private updateFilterPredicateFor(tabIndex: number) {
    const cols = this.columnsByTab[tabIndex] ?? [];
    if (!cols.length) {
      // Übersicht: alles durchlassen (oder leer)
      this.dataSource.filterPredicate = () => true;
      return;
    }
    this.dataSource.filterPredicate = (row: any, filter: string) => {
      const haystack = cols.map(c => String(row?.[c] ?? '').toLowerCase()).join(' ');
      return haystack.includes(filter);
    };
  }

  onTabChange(index: number): void {
    this.activeTabIndex = index;

    this.cd.detectChanges();
    queueMicrotask(() => {
      if (this.hasTable(index)) {
        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
          this.paginator.firstPage();
        }
        this.setActiveSortForTab(index);
        this.updateFilterPredicateFor(index);
        this.dataSource.filter = this.dataSource.filter;
      } else {
        this.dataSource.paginator = undefined as any;
        this.dataSource.sort = undefined as any;
      }
    });
  }

  isLeistungstestOk(value: any): boolean {
    if (value == null) return false;
    const s = String(value).trim().toLowerCase();
    if (!s || s === 'nein') return false;

    const year = this.getYearFromDate(value);
    if (isNaN(year)) return false;

    const currentYear = new Date().getFullYear();
    return year >= currentYear - 1; // aktuelles oder letztes Jahr
  }

  printChecklist(element: any): void {
    if (!element?.id) return;
    const idPdfCheckliste = this.pdf_konfig['idFmdDeckblatt'];
    const abfrageUrl = `pdf/templates/${idPdfCheckliste}/render`;

    let heute: any = new Date().toLocaleString('de-DE');
    heute = heute.split(",");
    heute = heute[0];

    const payload = {
      "druck_datum": heute,
      "fw_name": this.stammdaten.fw_name,
      "fw_nummer": this.stammdaten.fw_nummer,
      "fw_street": this.stammdaten.fw_street,
      "fw_plz": this.stammdaten.fw_plz,
      "fw_ort": this.stammdaten.fw_ort,
      "fw_email": this.stammdaten.fw_email,
      "fw_telefon": this.stammdaten.fw_telefon,
      "mitglied_stbnr": element.stbnr ?? "",
      "mitglied_vorname": element.vorname ?? "",
      "mitglied_zuname": element.nachname ?? "",
      "mitglied_alter": this.berechneAlter(element.geburtsdatum) ?? 0,
      "mitglied_letzte_untersuchung": element.letzte_untersuchung ?? ""
    }

    this.globalDataService.postBlob(abfrageUrl, payload).subscribe({
      next: (blob: Blob) => {
        if (blob.size === 0) {
          this.globalDataService.erstelleMessage('error', 'PDF ist leer (0 Bytes).');
          return;
        }

        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: (error: any) => this.globalDataService.errorAnzeigen(error)
    });
  }

  printOffeneUntersuchugen(): void {
    const today = new Date();
    let data = this.atstraeger.filter((m: any) => m.naechste_untersuchung == null || Number(m.naechste_untersuchung) <= today.getFullYear());
    data = this.globalDataService.arraySortByKey(data, 'naechste_untersuchung');
    this.printListe(data, "untersuchungen");
  }

  printTauglichkeit(): void {
    this.printListe(this.atstraeger, "tauglichkeit");
  }

  printLeistungstest(): void {
    this.printListe(this.atstraeger, "leistungstest");
  }

  private getYearSafe(value: any): number | null {
    if (value == null) return null;

    // falls du schon Jahreszahlen als "2027" bekommst
    if (typeof value === "number" && Number.isFinite(value)) return value;

    if (typeof value === "string") {
      const v = value.trim().toLowerCase();
      if (!v || v === "nein" || v === "none" || v === "null") return null;

      // "2027" direkt als Jahr
      const asNum = Number(v);
      if (Number.isFinite(asNum) && asNum > 1900 && asNum < 3000) return asNum;
    }

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.getFullYear();
  }

  printAlleMitglieder(): void {
    const memberMap = new Map<number, any>(
      this.atstraeger.map((a: any) => [Number(a.mitglied_id), a])
    );

    const toBool = (v: any): boolean =>
      v === true || v === 1 || v === "1" ||
      (typeof v === "string" && v.trim().toLowerCase() === "true");

    const data = this.mitgliederGesamt.map((m: any) => {
      const ats = memberMap.get(Number(m.pkid));

      // BF primär aus Mitglied, sonst aus ATS
      const isBF = toBool(m.hauptberuflich) || (ats ? toBool(ats.hauptberuflich) : false);

      // ATS-Träger: wenn ATS-Datensatz vorhanden -> Ja, sonst Nein
      // (Wenn du einen eigenen Mitglied-Flag hast, hier ergänzen: || toBool(m.ist_ats_traeger))
      const istAtsTraeger = !!ats;
      const liste_ats = istAtsTraeger ? "Ja" : "Nein";

      // ATS Felder (leer wenn nicht vorhanden)
      const tauglichkeit = ats?.tauglichkeit ?? null;
      const naechste_untersuchung = ats?.naechste_untersuchung ?? null;
      const leistungstest = ats?.leistungstest ?? null;

      const liste_tauglich =
        tauglichkeit == null ? "" : (tauglichkeit === "tauglich" ? "Ja" : "Nein");

      // Arzt: Status + Jahr (wenn vorhanden)
      const arztJahr = this.getYearSafe(naechste_untersuchung);
      let liste_arzt = "";
      if (arztJahr != null) {
        liste_arzt = arztJahr <= this.currentYear ? `Nicht OK | ${arztJahr}` : `OK | ${arztJahr}`;
      } else {
        // keine Info -> leer lassen (so wolltest du es)
        liste_arzt = "";
      }

      // Leistungstest (wie gehabt, nur Jahr safe)
      const hasNoTest =
        typeof leistungstest === "string" && leistungstest.trim().toLowerCase() === "nein";
      const testJahr = this.getYearSafe(leistungstest);

      let liste_leistungstest = "";
      if (leistungstest == null) {
        liste_leistungstest = "";
      } else if (hasNoTest) {
        liste_leistungstest = "Nicht OK";
      } else if (this.isLeistungstestOk(leistungstest)) {
        liste_leistungstest = "OK";
      } else {
        liste_leistungstest = `Nicht OK${testJahr ? " | " + testJahr : ""}`;
      }

      // BF überschreibt Anzeige (egal ob ATS vorhanden)
      if (isBF) {
        return {
          ...m,
          tauglichkeit,
          naechste_untersuchung,
          leistungstest,
          liste_ats: "Ja",
          liste_tauglich: "Ja",
          liste_arzt: "BF",
          liste_leistungstest: "BF",
        };
      }

      if (liste_ats == "Nein") {
        return {
          ...m,
          tauglichkeit,
          naechste_untersuchung,
          leistungstest,
          liste_ats,
          liste_tauglich: "-",
          liste_arzt: "-",
          liste_leistungstest: "-",
        };
      }

      return {
        ...m,
        tauglichkeit,
        naechste_untersuchung,
        leistungstest,
        liste_ats,
        liste_tauglich,
        liste_arzt,
        liste_leistungstest,
      };
    });

    const data_sort = this.globalDataService.arraySortByKey(data, "nachname");

    this.printListe(data_sort, "gesamt");
  }

  printListe(data: any, typ: string): void {
    const idPdfListe = this.pdf_konfig['idFmdListe'];
    const abfrageUrl = `pdf/templates/${idPdfListe}/render`;

    let heute: any = new Date().toLocaleString('de-DE');
    heute = heute.split(",");
    heute = heute[0];

    const payload = {
      "druck_datum": heute,
      "fw_name": this.stammdaten.fw_name,
      "fw_nummer": this.stammdaten.fw_nummer,
      "fw_street": this.stammdaten.fw_street,
      "fw_plz": this.stammdaten.fw_plz,
      "fw_ort": this.stammdaten.fw_ort,
      "fw_email": this.stammdaten.fw_email,
      "fw_telefon": this.stammdaten.fw_telefon,
      "ats_traeger_liste": data,
      "fmd_export_liste_typ": typ
    }

    this.globalDataService.postBlob(abfrageUrl, payload).subscribe({
      next: (blob: Blob) => {
        if (blob.size === 0) {
          this.globalDataService.erstelleMessage('error', 'PDF ist leer (0 Bytes).');
          return;
        }

        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: (error: any) => this.globalDataService.errorAnzeigen(error)
    });

  }
}


