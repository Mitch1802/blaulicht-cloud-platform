import { Component, OnInit, inject } from '@angular/core';
import { GlobalDataService } from 'src/app/_service/global-data.service';
import { HeaderComponent } from '../header/header.component';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { IAtemschutzGeraet } from 'src/app/_interface/atemschutz_geraet';
import { MatIcon } from '@angular/material/icon';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { IAtemschutzGeraetProtokoll } from 'src/app/_interface/atemschutz_geraet_protokoll';
import { IMitglied } from 'src/app/_interface/mitglied';

@Component({
  selector: 'app--atemschutzgeraete',
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
    MatSortModule,
    MatPaginatorModule,
    MatIcon,
    MatCheckboxModule
  ],
  templateUrl: './atemschutz-geraete.component.html',
  styleUrl: './atemschutz-geraete.component.sass'
})
export class AtemschutzGeraeteComponent implements OnInit {
  globalDataService = inject(GlobalDataService);

  title = "Geräte";
  title_modul = this.title;
  title_pruefung = "Geräte Prüfung";
  modul = "atemschutz/geraete";
  showPruefungForm: boolean = false;
  showPruefungTable: boolean = false;

  geraete: IAtemschutzGeraet[] = [];
  pruefungen: IAtemschutzGeraetProtokoll[] = [];
  mitglieder: IMitglied[] = [];
  breadcrumb: any = [];
  dataSource = new MatTableDataSource<IAtemschutzGeraet>(this.geraete);
  dataSourcePruefungen = new MatTableDataSource<IAtemschutzGeraetProtokoll>(this.pruefungen);
  sichtbareSpalten: string[] = ['inv_nr', 'typ', 'art', 'standort', 'actions'];
  sichtbareSpaltenPruefungen: string[] = ['datum', 'taetigkeit', 'name_pruefer', 'actions'];

  formModul = new FormGroup({
    id: new FormControl(''),
    inv_nr: new FormControl('', Validators.required),
    art: new FormControl(''),
    typ: new FormControl(''),
    druckminderer: new FormControl(''),
    lungenautomat: new FormControl(''),
    rahmen_nr: new FormControl(''),
    eigentuemer: new FormControl(''),
    barcode: new FormControl(''),
    standort: new FormControl(''),
    baujahr: new FormControl(''),
    datum_im_dienst: new FormControl(''),
    naechste_gue: new FormControl('')
  });

  formPruefung = new FormGroup({
    id: new FormControl(''),
    geraet_id: new FormControl(0, Validators.required),
    datum: new FormControl('', [
      Validators.pattern(/^([0-3]\d)\.([0-1]\d)\.(\d{4})$/),
      this.validDateDDMMYYYY(),
      Validators.required
    ]),
    taetigkeit: new FormControl(''),
    verwendung_typ: new FormControl(''),
    verwendung_min: new FormControl(0),
    mitglied_id: new FormControl(0),
    geraet_ok: new FormControl(false),
    name_pruefer: new FormControl('', Validators.required),
    tausch_gleitring: new FormControl(false),
    tausch_hochdruckdichtring: new FormControl(false),
    tausch_membran: new FormControl(false),
    pruefung_10jahre: new FormControl(false),
    pruefung_jaehrlich: new FormControl(false),
    preufung_monatlich: new FormControl(false),
    notiz: new FormControl(''),
  });

  ngOnInit(): void {
    sessionStorage.setItem("PageNumber", "3");
    sessionStorage.setItem("Page3", "ATM_G");
    this.breadcrumb = this.globalDataService.ladeBreadcrumb();
    this.formModul.disable();
    this.formPruefung.disable();

    this.globalDataService.get(this.modul).subscribe({
      next: (erg: any) => {
        try {
          this.geraete = erg.main as any[];
          this.dataSource.data = erg.main as any[];

          const fmd = erg.fmd as any[];
          const mitgliederGesamt= erg.mitglieder as any[];
          const memberMap = new Map<number, any>(mitgliederGesamt.map((m: any) => [m.pkid, m]));

          this.mitglieder = fmd.map(item => {
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
          this.mitglieder = this.globalDataService.arraySortByKey(this.mitglieder, 'stbnr');
        } catch (e: any) {
          this.globalDataService.erstelleMessage("error", e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      }
    });
  }

  neueDetails(): void {
    this.formModul.enable();
  }

  neuePruefung(): void {
    this.showPruefungForm = true;
    this.formPruefung.enable();
    this.title = this.title_pruefung;
  }

  neuePruefungVonMaske(element: any): void {
    this.showPruefungForm = true;
    this.formPruefung.enable();
    this.title = this.title_pruefung;
    this.formPruefung.controls['geraet_id'].setValue(element.pkid);
    this.formPruefung.controls['geraet_id'].disable();
  }

  auswahlBearbeiten(element: any): void {
    if (element.id === 0) {
      return;
    }
    const abfrageUrl = `${this.modul}/${element.id}`;

    this.globalDataService.get(abfrageUrl).subscribe({
      next: (erg: any) => {
        try {
          const details: IAtemschutzGeraet = erg;
          this.formModul.enable();
          this.formModul.setValue({
            id: details.id,
            inv_nr: details.inv_nr,
            art: details.art,
            typ: details.typ,
            druckminderer: details.druckminderer,
            lungenautomat: details.lungenautomat,
            rahmen_nr: details.rahmen_nr,
            eigentuemer: details.eigentuemer,
            barcode: details.barcode,
            standort: details.standort,
            baujahr: details.baujahr,
            datum_im_dienst: details.datum_im_dienst,
            naechste_gue: details.naechste_gue
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

  showMasken(): void {
    this.showPruefungTable = false;
    this.title = this.title_modul;
  }

  showPruefungen(element: any): void {
    if (element.id === 0) {
      return;
    }
    this.title = this.title_pruefung;

    const abfrageUrl = `${this.modul}/protokoll`;
    const param = { 'geraet_id': element.pkid };

    this.globalDataService.get(abfrageUrl, param, true).subscribe({
      next: (erg: any) => {
        try {
          this.showPruefungTable = true;
          this.pruefungen = erg;
          this.dataSourcePruefungen.data = this.pruefungen;
        } catch (e: any) {
          this.globalDataService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      }
    });
  }

  auswahlBearbeitenProtokoll(element: any): void {
    if (element.id === 0) {
      return;
    }
    const abfrageUrl = `${this.modul}/protokoll/${element.id}`;

    this.globalDataService.get(abfrageUrl).subscribe({
      next: (erg: any) => {
        try {
          this.showPruefungTable = false;
          this.showPruefungForm = true;
          const details: IAtemschutzGeraetProtokoll = erg;
          this.formPruefung.setValue({
            id: details.id,
            geraet_id: details.geraet_id,
            datum: details.datum,
            taetigkeit: details.taetigkeit,
            verwendung_typ: details.verwendung_typ,
            verwendung_min: details.verwendung_min,
            mitglied_id: details.mitglied_id,
            geraet_ok: details.geraet_ok,
            name_pruefer: details.name_pruefer,
            tausch_hochdruckdichtring: details.tausch_hochdruckdichtring,
            tausch_membran: details.tausch_membran,
            tausch_gleitring: details.tausch_gleitring,
            pruefung_10jahre: details.pruefung_10jahre,
            pruefung_jaehrlich: details.pruefung_jaehrlich,
            preufung_monatlich: details.preufung_monatlich,
            notiz: details.notiz,
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

    if (!idValue) {
      this.globalDataService.post(this.modul, objekt, false).subscribe({
        next: (erg: any) => {
          try {
            const newMask: IAtemschutzGeraet = erg;

            this.geraete.push(newMask);
            this.geraete = this.globalDataService.arraySortByKey(this.geraete, 'inv_nr');
            this.dataSource.data = this.geraete;

            this.formModul.reset({
              id: '',
              inv_nr: '',
              art: '',
              typ: '',
              druckminderer: '',
              lungenautomat: '',
              rahmen_nr: '',
              eigentuemer: '',
              barcode: '',
              standort: '',
              baujahr: '',
              datum_im_dienst: '',
              naechste_gue: ''
            });
            this.formModul.disable();
            this.globalDataService.erstelleMessage('success', 'Gerät gespeichert!');
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
            this.geraete = this.geraete
              .map(m => m.id === updated.id ? updated : m)
              .sort((a, b) => a.inv_nr - b.inv_nr);

            this.dataSource.data = this.geraete;

            this.formModul.reset({
              id: '',
              inv_nr: '',
              art: '',
              typ: '',
              druckminderer: '',
              lungenautomat: '',
              rahmen_nr: '',
              eigentuemer: '',
              barcode: '',
              standort: '',
              baujahr: '',
              datum_im_dienst: '',
              naechste_gue: ''
            });
            this.formModul.disable();

            this.globalDataService.erstelleMessage('success', 'Gerät geändert!');
          } catch (e: any) {
            this.globalDataService.erstelleMessage('error', e);
          }
        },
        error: (error: any) => this.globalDataService.errorAnzeigen(error)
      });
    }
  }

  datenSpeichernProtokoll(): void {
    if (this.formPruefung.invalid) {
      this.globalDataService.erstelleMessage('error', 'Bitte alle Pflichtfelder korrekt ausfüllen!');
      return;
    }
    const objekt: any = this.formPruefung.getRawValue();
    const idValue = this.formPruefung.controls['id'].value;

    if (!idValue) {
      this.globalDataService.post(`${this.modul}/protokoll`, objekt, false).subscribe({
        next: (erg: any) => {
          try {
            const newPrufung: IAtemschutzGeraetProtokoll = erg;
            this.pruefungen.push(newPrufung);
            this.pruefungen = this.globalDataService.arraySortByKey(this.pruefungen, 'datum');
            this.dataSourcePruefungen.data = this.pruefungen;

            this.formPruefung.reset({
              id: '',
              geraet_id: 0,
              taetigkeit: '',
              verwendung_typ: '',
              verwendung_min: 0,
              mitglied_id: 0,
              geraet_ok: false,
              name_pruefer: '',
              tausch_hochdruckdichtring: false,
              tausch_membran: false,
              tausch_gleitring: false,
              pruefung_10jahre: false,
              pruefung_jaehrlich: false,
              preufung_monatlich: false,
              notiz: '',
            });
            this.formPruefung.disable();
            this.showPruefungForm = false;
            this.showPruefungTable = false;
            this.globalDataService.erstelleMessage('success', 'Protokoll gespeichert!');
          } catch (e: any) {
            this.globalDataService.erstelleMessage('error', e);
          }
        },
        error: (error: any) => this.globalDataService.errorAnzeigen(error)
      });
    // } else {
    //   this.globalDataService.patch(`${this.modul}/protokoll`, idValue, objekt, false).subscribe({
    //     next: (erg: any) => {
    //       try {
    //         const updated: any = erg;
    //         this.pruefungen = this.pruefungen
    //           .map(m => m.id === updated.id ? updated : m)
    //           .sort((a, b) => a.datum - b.datum);

    //         this.dataSourcePruefungen.data = this.pruefungen;

    //         this.formPruefung.reset({
    //           id: '',
    //           geraet_id: 0,
    //           taetigkeit: '',
    //           verwendung_typ: '',
    //           verwendung_min: 0,
    //           mitglied_id: 0,
    //           geraet_ok: false,
    //           name_pruefer: '',
    //           tausch_hochdruckdichtring: false,
    //           tausch_membran: false,
    //           tausch_gleitring: false,
    //           pruefung_10jahre: false,
    //           pruefung_jaehrlich: false,
    //           preufung_monatlich: false,
    //           notiz: '',
    //         });
    //         this.formPruefung.disable();
    //         this.showPruefungTable = true;
    //         this.globalDataService.erstelleMessage('success', 'Protokoll geändert!');
    //       } catch (e: any) {
    //         this.globalDataService.erstelleMessage('error', e);
    //       }
    //     },
    //     error: (error: any) => this.globalDataService.errorAnzeigen(error)
    //   });
    }
  }

  abbrechen(): void {
    this.globalDataService.erstelleMessage("info", "Gerät nicht gespeichert!");
    this.formModul.reset({
      id: '',
      inv_nr: '',
      art: '',
      typ: '',
      druckminderer: '',
      lungenautomat: '',
      rahmen_nr: '',
      eigentuemer: '',
      barcode: '',
      standort: '',
      baujahr: '',
      datum_im_dienst: '',
      naechste_gue: ''
    });
    this.formModul.disable();
  }

  pruefungAbbrechen(): void {
    this.globalDataService.erstelleMessage("info", "Prüfung nicht gespeichert!");
    this.formPruefung.reset({
      id: '',
      geraet_id: 0,
      taetigkeit: '',
      verwendung_typ: '',
      verwendung_min: 0,
      mitglied_id: 0,
      geraet_ok: false,
      name_pruefer: '',
      tausch_hochdruckdichtring: false,
      tausch_membran: false,
      tausch_gleitring: false,
      pruefung_10jahre: false,
      pruefung_jaehrlich: false,
      preufung_monatlich: false,
      notiz: '',
    });
    this.formPruefung.disable();
    this.title = this.title_modul;
    this.showPruefungForm = false;
    this.showPruefungTable = false;
  }

  datenLoeschen(): void {
    const id = this.formModul.controls['id'].value!;
    if (!id) {
      this.globalDataService.erstelleMessage('error', 'Keine Gerät ausgewählt zum Löschen!');
      return;
    }

    this.globalDataService.delete(this.modul, id).subscribe({
      next: (erg: any) => {
        try {
          this.geraete = this.geraete.filter((m: any) => m.id !== id);
          this.dataSource.data = this.geraete;

          this.formModul.reset({
            id: '',
            inv_nr: '',
            art: '',
            typ: '',
            druckminderer: '',
            lungenautomat: '',
            rahmen_nr: '',
            eigentuemer: '',
            barcode: '',
            standort: '',
            baujahr: '',
            datum_im_dienst: '',
            naechste_gue: ''
          });
          this.formModul.disable();

          this.globalDataService.erstelleMessage('success', 'Gerät erfolgreich gelöscht!');
        } catch (e: any) {
          this.globalDataService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      }
    });
  }

  datenProtokollLoeschen(): void {
    const id = this.formPruefung.controls['id'].value!;
    if (!id) {
      this.globalDataService.erstelleMessage('error', 'Kein Protokoll ausgewählt zum Löschen!');
      return;
    }

    this.globalDataService.delete(`${this.modul}/protokoll`, id).subscribe({
      next: (erg: any) => {
        try {
          this.pruefungen = this.pruefungen.filter((m: any) => m.id !== id);
          this.dataSourcePruefungen.data = this.pruefungen;

          this.formPruefung.reset({
            id: '',
            geraet_id: 0,
            taetigkeit: '',
            verwendung_typ: '',
            verwendung_min: 0,
            mitglied_id: 0,
            geraet_ok: false,
            name_pruefer: '',
            tausch_hochdruckdichtring: false,
            tausch_membran: false,
            tausch_gleitring: false,
            pruefung_10jahre: false,
            pruefung_jaehrlich: false,
            preufung_monatlich: false,
            notiz: '',
          });
          this.formPruefung.disable();
          this.showPruefungForm = false;
          this.showPruefungTable = true;
          this.globalDataService.erstelleMessage('success', 'Protokoll erfolgreich gelöscht!');
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

  sichtbarkeitModul(): string {
    let modulSichtbar = "";

    if (!this.formModul.disabled) {
      modulSichtbar = "formModul";
    } else if (this.formModul.disabled && !this.showPruefungTable && !this.showPruefungForm) {
      modulSichtbar = "tableListe";
    } else if (this.showPruefungForm) {
      modulSichtbar = "formPruefung";
    } else if (this.showPruefungTable) {
      modulSichtbar = "tablePruefungen";
    }

    return modulSichtbar;
  }
}
