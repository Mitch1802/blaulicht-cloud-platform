import { Component, OnInit, inject } from '@angular/core';
import { GlobalDataService } from 'src/app/_service/global-data.service';
import { HeaderComponent } from '../header/header.component';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { IAtemschutzMaske } from 'src/app/_interface/atemschutz_maske';
import { MatIcon } from '@angular/material/icon';
import { IAtemschutzMaskeProtokoll } from 'src/app/_interface/atemschutz_maske_protokoll';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-atemschutz-masken',
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
    MatCheckboxModule,
  ],
  templateUrl: './atemschutz-masken.component.html',
  styleUrl: './atemschutz-masken.component.sass',
})
export class AtemschutzMaskenComponent implements OnInit {
  globalDataService = inject(GlobalDataService);

  title = 'Masken';
  title_modul = this.title;
  title_pruefung = 'Masken Prüfung';
  modul = 'atemschutz/masken';
  showPruefungForm: boolean = false;
  showPruefungTable: boolean = false;

  masken: IAtemschutzMaske[] = [];
  pruefungen: IAtemschutzMaskeProtokoll[] = [];
  breadcrumb: any = [];
  dataSource = new MatTableDataSource<IAtemschutzMaske>(this.masken);
  dataSourcePruefungen = new MatTableDataSource<IAtemschutzMaskeProtokoll>(
    this.pruefungen
  );
  sichtbareSpalten: string[] = ['inv_nr', 'typ', 'art', 'actions'];
  sichtbareSpaltenPruefungen: string[] = [
    'datum',
    'taetigkeit',
    'name_pruefer',
    'actions',
  ];

  formModul = new FormGroup({
    id: new FormControl(''),
    inv_nr: new FormControl('', Validators.required),
    art: new FormControl(''),
    typ: new FormControl(''),
    eigentuemer: new FormControl(''),
    barcode: new FormControl(''),
    baujahr: new FormControl(''),
  });

  formPruefung = new FormGroup({
    id: new FormControl(''),
    maske_id: new FormControl(0, Validators.required),
    datum: new FormControl('', [
      Validators.pattern(/^([0-3]\d)\.([0-1]\d)\.(\d{4})$/),
      this.validDateDDMMYYYY(),
      Validators.required,
    ]),
    taetigkeit: new FormControl(''),
    verwendung_typ: new FormControl(''),
    verwendung_min: new FormControl(0),
    wartung_2_punkt: new FormControl(false),
    wartung_unterdruck: new FormControl(false),
    wartung_oeffnungsdruck: new FormControl(false),
    wartung_scheibe: new FormControl(false),
    wartung_ventile: new FormControl(false),
    wartung_maengel: new FormControl(false),
    ausser_dienst: new FormControl(false),
    tausch_sprechmembran: new FormControl(false),
    tausch_ausatemventil: new FormControl(false),
    tausch_sichtscheibe: new FormControl(false),
    name_pruefer: new FormControl('', Validators.required),
    notiz: new FormControl(''),
  });

  ngOnInit(): void {
    sessionStorage.setItem('PageNumber', '3');
    sessionStorage.setItem('Page3', 'ATM_M');
    this.breadcrumb = this.globalDataService.ladeBreadcrumb();
    this.formModul.disable();
    this.formPruefung.disable();

    this.globalDataService.get(this.modul).subscribe({
      next: (erg: any) => {
        try {
          this.masken = erg;
          this.dataSource.data = erg;
        } catch (e: any) {
          this.globalDataService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      },
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
    this.formPruefung.controls['maske_id'].setValue(element.pkid);
    this.formPruefung.controls['maske_id'].disable();
  }

  auswahlBearbeiten(element: any): void {
    if (element.id === 0) {
      return;
    }
    const abfrageUrl = `${this.modul}/${element.id}`;

    this.globalDataService.get(abfrageUrl).subscribe({
      next: (erg: any) => {
        try {
          const details: IAtemschutzMaske = erg;

          this.formModul.enable();
          this.formModul.setValue({
            id: details.id,
            inv_nr: details.inv_nr,
            art: details.art,
            typ: details.typ,
            eigentuemer: details.eigentuemer,
            barcode: details.barcode,
            baujahr: details.baujahr,
          });
        } catch (e: any) {
          this.globalDataService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      },
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
    const param = { maske_id: element.pkid };

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
      },
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
          const details: IAtemschutzMaskeProtokoll = erg;
          this.formPruefung.setValue({
            id: details.id,
            maske_id: details.maske_id,
            datum: details.datum,
            taetigkeit: details.taetigkeit,
            verwendung_typ: details.verwendung_typ,
            verwendung_min: details.verwendung_min,
            wartung_2_punkt: details.wartung_2_punkt,
            wartung_unterdruck: details.wartung_unterdruck,
            wartung_oeffnungsdruck: details.wartung_oeffnungsdruck,
            wartung_scheibe: details.wartung_scheibe,
            wartung_ventile: details.wartung_ventile,
            wartung_maengel: details.wartung_maengel,
            ausser_dienst: details.ausser_dienst,
            tausch_sprechmembran: details.tausch_sprechmembran,
            tausch_ausatemventil: details.tausch_ausatemventil,
            tausch_sichtscheibe: details.tausch_sichtscheibe,
            name_pruefer: details.name_pruefer,
            notiz: details.notiz,
          });
        } catch (e: any) {
          this.globalDataService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      },
    });
  }

  datenSpeichern(): void {
    if (this.formModul.invalid) {
      this.globalDataService.erstelleMessage(
        'error',
        'Bitte alle Pflichtfelder korrekt ausfüllen!'
      );
      return;
    }

    const objekt: any = this.formModul.value;
    const idValue = this.formModul.controls['id'].value;

    if (!idValue) {
      this.globalDataService.post(this.modul, objekt, false).subscribe({
        next: (erg: any) => {
          try {
            const newMask: IAtemschutzMaske = erg;
            this.masken.push(newMask);
            this.masken = this.globalDataService.arraySortByKey(
              this.masken,
              'inv_nr'
            );
            this.dataSource.data = this.masken;

            this.formModul.reset({
              id: '',
              inv_nr: '',
              art: '',
              typ: '',
              eigentuemer: '',
              barcode: '',
              baujahr: '',
            });
            this.formModul.disable();
            this.globalDataService.erstelleMessage(
              'success',
              'Maske gespeichert!'
            );
          } catch (e: any) {
            this.globalDataService.erstelleMessage('error', e);
          }
        },
        error: (error: any) => this.globalDataService.errorAnzeigen(error),
      });
    } else {
      this.globalDataService
        .patch(this.modul, idValue, objekt, false)
        .subscribe({
          next: (erg: any) => {
            try {
              const updated: any = erg;
              this.masken = this.masken
                .map((m) => (m.id === updated.id ? updated : m))
                .sort((a, b) => a.inv_nr - b.inv_nr);

              this.dataSource.data = this.masken;

              this.formModul.reset({
                id: '',
                inv_nr: '',
                art: '',
                typ: '',
                eigentuemer: '',
                barcode: '',
                baujahr: '',
              });
              this.formModul.disable();

              this.globalDataService.erstelleMessage(
                'success',
                'Maske geändert!'
              );
            } catch (e: any) {
              this.globalDataService.erstelleMessage('error', e);
            }
          },
          error: (error: any) => this.globalDataService.errorAnzeigen(error),
        });
    }
  }

  datenSpeichernProtokoll(): void {
    if (this.formPruefung.invalid) {
      this.globalDataService.erstelleMessage(
        'error',
        'Bitte alle Pflichtfelder korrekt ausfüllen!'
      );
      return;
    }
    const objekt: any = this.formPruefung.getRawValue();
    const idValue = this.formPruefung.controls['id'].value;

    if (!idValue) {
      this.globalDataService
        .post(`${this.modul}/protokoll`, objekt, false)
        .subscribe({
          next: (erg: any) => {
            try {
              const newPrufung: IAtemschutzMaskeProtokoll = erg;
              this.pruefungen.push(newPrufung);
              this.pruefungen = this.globalDataService.arraySortByKey(
                this.pruefungen,
                'datum'
              );
              this.dataSourcePruefungen.data = this.pruefungen;

              this.formPruefung.reset({
                id: '',
                maske_id: 0,
                taetigkeit: '',
                verwendung_typ: '',
                verwendung_min: 0,
                wartung_2_punkt: false,
                wartung_unterdruck: false,
                wartung_oeffnungsdruck: false,
                wartung_scheibe: false,
                wartung_ventile: false,
                wartung_maengel: false,
                ausser_dienst: false,
                tausch_sprechmembran: false,
                tausch_ausatemventil: false,
                tausch_sichtscheibe: false,
                name_pruefer: '',
                notiz: '',
              });
              this.formPruefung.disable();
              this.showPruefungForm = false;
              this.showPruefungTable = false;
              this.globalDataService.erstelleMessage(
                'success',
                'Protokoll gespeichert!'
              );
            } catch (e: any) {
              this.globalDataService.erstelleMessage('error', e);
            }
          },
          error: (error: any) => this.globalDataService.errorAnzeigen(error),
        });
    // } else {
    //   this.globalDataService
    //     .patch(`${this.modul}/protokoll`, idValue, objekt, false)
    //     .subscribe({
    //       next: (erg: any) => {
    //         try {
    //           const updated: any = erg;
    //           this.pruefungen = this.pruefungen
    //             .map((m) => (m.id === updated.id ? updated : m))
    //             .sort((a, b) => a.datum - b.datum);

    //           this.dataSourcePruefungen.data = this.pruefungen;

    //           this.formPruefung.reset({
    //             id: '',
    //             maske_id: 0,
    //             taetigkeit: '',
    //             verwendung_typ: '',
    //             verwendung_min: 0,
    //             wartung_2_punkt: false,
    //             wartung_unterdruck: false,
    //             wartung_oeffnungsdruck: false,
    //             wartung_scheibe: false,
    //             wartung_ventile: false,
    //             wartung_maengel: false,
    //             ausser_dienst: false,
    //             tausch_sprechmembran: false,
    //             tausch_ausatemventil: false,
    //             tausch_sichtscheibe: false,
    //             name_pruefer: '',
    //             notiz: '',
    //           });
    //           this.formPruefung.disable();
    //           this.showPruefungTable = true;
    //           this.globalDataService.erstelleMessage(
    //             'success',
    //             'Protokoll geändert!'
    //           );
    //         } catch (e: any) {
    //           this.globalDataService.erstelleMessage('error', e);
    //         }
    //       },
    //       error: (error: any) => this.globalDataService.errorAnzeigen(error),
    //     });
    }
  }

  abbrechen(): void {
    this.globalDataService.erstelleMessage('info', 'Maske nicht gespeichert!');
    this.formModul.reset({
      id: '',
      inv_nr: '',
      art: '',
      typ: '',
      eigentuemer: '',
      barcode: '',
      baujahr: '',
    });
    this.formModul.disable();
  }

  pruefungAbbrechen(): void {
    this.globalDataService.erstelleMessage(
      'info',
      'Prüfung nicht gespeichert!'
    );
    this.formPruefung.reset({
      id: '',
      maske_id: 0,
      taetigkeit: '',
      verwendung_typ: '',
      verwendung_min: 0,
      wartung_2_punkt: false,
      wartung_unterdruck: false,
      wartung_oeffnungsdruck: false,
      wartung_scheibe: false,
      wartung_ventile: false,
      wartung_maengel: false,
      ausser_dienst: false,
      tausch_sprechmembran: false,
      tausch_ausatemventil: false,
      tausch_sichtscheibe: false,
      name_pruefer: '',
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
      this.globalDataService.erstelleMessage(
        'error',
        'Keine Maske ausgewählt zum Löschen!'
      );
      return;
    }

    this.globalDataService.delete(this.modul, id).subscribe({
      next: (erg: any) => {
        try {
          this.masken = this.masken.filter((m: any) => m.id !== id);
          this.dataSource.data = this.masken;

          this.formModul.reset({
            id: '',
            inv_nr: '',
            art: '',
            typ: '',
            eigentuemer: '',
            barcode: '',
            baujahr: '',
          });
          this.formModul.disable();

          this.globalDataService.erstelleMessage(
            'success',
            'Maske erfolgreich gelöscht!'
          );
        } catch (e: any) {
          this.globalDataService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      },
    });
  }

  datenProtokollLoeschen(): void {
    const id = this.formPruefung.controls['id'].value!;
    if (!id) {
      this.globalDataService.erstelleMessage(
        'error',
        'Kein Protokoll ausgewählt zum Löschen!'
      );
      return;
    }

    this.globalDataService.delete(`${this.modul}/protokoll`, id).subscribe({
      next: (erg: any) => {
        try {
          this.pruefungen = this.pruefungen.filter((m: any) => m.id !== id);
          this.dataSourcePruefungen.data = this.pruefungen;

          this.formPruefung.reset({
            id: '',
            maske_id: 0,
            taetigkeit: '',
            verwendung_typ: '',
            verwendung_min: 0,
            wartung_2_punkt: false,
            wartung_unterdruck: false,
            wartung_oeffnungsdruck: false,
            wartung_scheibe: false,
            wartung_ventile: false,
            wartung_maengel: false,
            ausser_dienst: false,
            tausch_sprechmembran: false,
            tausch_ausatemventil: false,
            tausch_sichtscheibe: false,
            name_pruefer: '',
            notiz: '',
          });
          this.formPruefung.disable();
          this.showPruefungForm = false;
          this.showPruefungTable = true;
          this.globalDataService.erstelleMessage(
            'success',
            'Protokoll erfolgreich gelöscht!'
          );
        } catch (e: any) {
          this.globalDataService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      },
    });
  }

  validDateDDMMYYYY(): ValidatorFn {
    return (control: AbstractControl) => {
      const v: string = control.value;
      if (!v || !/^([0-3]\d)\.([0-1]\d)\.(\d{4})$/.test(v)) {
        return null;
      }
      const [t, m, j] = v.split('.').map((x) => +x);
      const d = new Date(j, m - 1, t);
      return d.getFullYear() === j &&
        d.getMonth() === m - 1 &&
        d.getDate() === t
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
