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
import { MatIcon } from '@angular/material/icon';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { IMessgeraet } from 'src/app/_interface/messgeraet';
import { IMessgeraetProtokoll } from 'src/app/_interface/messgeraet_protokoll';

@Component({
  selector: 'app-atemschutz-messgeraete',
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
  templateUrl: './atemschutz-messgeraete.component.html',
  styleUrl: './atemschutz-messgeraete.component.sass'
})
export class AtemschutzMessgeraeteComponent implements OnInit {
  globalDataService = inject(GlobalDataService);

  title = 'Messgeräte';
  title_modul = this.title;
  title_pruefung = 'Messgeräte Prüfung';
  modul = 'atemschutz/messgeraete';
  showPruefungForm: boolean = false;
  showPruefungTable: boolean = false;

  messgeraete: IMessgeraet[] = [];
  pruefungen: IMessgeraetProtokoll[] = [];
  breadcrumb: any = [];
  dataSource = new MatTableDataSource<IMessgeraet>(this.messgeraete);
  dataSourcePruefungen = new MatTableDataSource<IMessgeraetProtokoll>(
    this.pruefungen
  );
  sichtbareSpalten: string[] = ['inv_nr', 'bezeichnung', 'actions'];
  sichtbareSpaltenPruefungen: string[] = [
    'datum',
    'name_pruefer',
    'actions',
  ];

  formModul = new FormGroup({
    id: new FormControl(''),
    inv_nr: new FormControl('', Validators.required),
    bezeichnung: new FormControl('', Validators.required),
    eigentuemer: new FormControl(''),
    barcode: new FormControl(''),
    baujahr: new FormControl(''),
  });

  formPruefung = new FormGroup({
    id: new FormControl(''),
    geraet_id: new FormControl(0, Validators.required),
    datum: new FormControl('', [
      Validators.pattern(/^([0-3]\d)\.([0-1]\d)\.(\d{4})$/),
      this.validDateDDMMYYYY(),
      Validators.required,
    ]),
    kalibrierung: new FormControl(false),
    kontrolle_woechentlich: new FormControl(false),
    wartung_jaehrlich: new FormControl(false),
    name_pruefer: new FormControl('', Validators.required),
  });

  ngOnInit(): void {
    sessionStorage.setItem("PageNumber", "3");
    sessionStorage.setItem("Page3", "ATM_MG");
    this.breadcrumb = this.globalDataService.ladeBreadcrumb();
    this.formModul.disable();
    this.formPruefung.disable();

    this.globalDataService.get(this.modul).subscribe({
      next: (erg: any) => {
        try {
          this.messgeraete = erg;
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

  neuePruefungVonMessgeraet(element: any): void {
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
          const details: IMessgeraet = erg;

          this.formModul.enable();
          this.formModul.setValue({
            id: details.id,
            inv_nr: details.inv_nr,
            bezeichnung: details.bezeichnung,
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

  showMessgeraete(): void {
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
          const details: IMessgeraetProtokoll = erg;
          this.formPruefung.setValue({
            id: details.id,
            geraet_id: details.geraet_id,
            datum: details.datum,
            kalibrierung: details.kalibrierung,
            kontrolle_woechentlich: details.kontrolle_woechentlich,
            wartung_jaehrlich: details.wartung_jaehrlich,
            name_pruefer: details.name_pruefer,
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
            const newMask: IMessgeraet = erg;
            this.messgeraete.push(newMask);
            this.messgeraete = this.globalDataService.arraySortByKey(
              this.messgeraete,
              'inv_nr'
            );
            this.dataSource.data = this.messgeraete;

            this.formModul.reset({
              id: '',
              inv_nr: '',
              bezeichnung: '',
              eigentuemer: '',
              barcode: '',
              baujahr: '',
            });
            this.formModul.disable();
            this.globalDataService.erstelleMessage(
              'success',
              'Messgerät gespeichert!'
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
              this.messgeraete = this.messgeraete
                .map((m) => (m.id === updated.id ? updated : m))
                .sort((a, b) => a.inv_nr - b.inv_nr);

              this.dataSource.data = this.messgeraete;

              this.formModul.reset({
                id: '',
                inv_nr: '',
                bezeichnung: '',
                eigentuemer: '',
                barcode: '',
                baujahr: '',
              });
              this.formModul.disable();

              this.globalDataService.erstelleMessage(
                'success',
                'Messgerät geändert!'
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
              const newPrufung: IMessgeraetProtokoll = erg;
              this.pruefungen.push(newPrufung);
              this.pruefungen = this.globalDataService.arraySortByKey(
                this.pruefungen,
                'datum'
              );
              this.dataSourcePruefungen.data = this.pruefungen;

              this.formPruefung.reset({
                id: '',
                geraet_id: 0,
                kalibrierung: false,
                kontrolle_woechentlich: false,
                wartung_jaehrlich: false,
                name_pruefer: '',
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
    //             geraet_id: 0,
    //             kalibrierung: false,
    //             kontrolle_woechentlich: false,
    //             wartung_jaehrlich: false,
    //             name_pruefer: '',
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
    this.globalDataService.erstelleMessage('info', 'Messgerät nicht gespeichert!');
    this.formModul.reset({
      id: '',
      inv_nr: '',
      bezeichnung: '',
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
      geraet_id: 0,
      kalibrierung: false,
      kontrolle_woechentlich: false,
      wartung_jaehrlich: false,
      name_pruefer: '',
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
          this.messgeraete = this.messgeraete.filter((m: any) => m.id !== id);
          this.dataSource.data = this.messgeraete;

          this.formModul.reset({
            id: '',
            inv_nr: '',
            bezeichnung: '',
            eigentuemer: '',
            barcode: '',
            baujahr: '',
          });
          this.formModul.disable();

          this.globalDataService.erstelleMessage(
            'success',
            'Messgerät erfolgreich gelöscht!'
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
            geraet_id: 0,
            kalibrierung: false,
            kontrolle_woechentlich: false,
            wartung_jaehrlich: false,
            name_pruefer: '',
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

