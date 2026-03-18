import { Component, OnInit, inject } from '@angular/core';
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
import { IMR_UI_COMPONENTS } from '../../imr-ui-library';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
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
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { IMessgeraet } from 'src/app/_interface/messgeraet';
import { IMessgeraetProtokoll } from 'src/app/_interface/messgeraet_protokoll';
import { DateInputMaskDirective } from '../../_directive/date-input-mask.directive';

@Component({
  selector: 'app-atemschutz-messgeraete',
  imports: [
    ...IMR_UI_COMPONENTS,
    MatButtonModule,
    MatInputModule,
    MatTabsModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    DateInputMaskDirective,
  ],
  templateUrl: './atemschutz-messgeraete.component.html',
  styleUrl: './atemschutz-messgeraete.component.sass'
})
export class AtemschutzMessgeraeteComponent implements OnInit {
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  title = 'Messgeräte verwalten';
  title_modul = this.title;
  title_pruefung = 'Messgeräte prüfen';
  modul = 'atemschutz/messgeraete';
  showPruefungForm: boolean = false;
  showPruefungTable: boolean = false;

  messgeraete: IMessgeraet[] = [];
  pruefungen: IMessgeraetProtokoll[] = [];
  userRoles: string[] = [];
  canEditProtocol = false;
  rolesResolved = false;
  breadcrumb: any = [];
  dataSource = new MatTableDataSource<IMessgeraet>(this.messgeraete);
  dataSourcePruefungen = new MatTableDataSource<IMessgeraetProtokoll>(
    this.pruefungen
  );
  sichtbareSpalten: string[] = ['inv_nr', 'bezeichnung', 'letzte_pruefung', 'naechste_pruefung', 'actions'];
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
    this.breadcrumb = this.navigationService.ladeBreadcrumb();
    this.formModul.disable();
    this.formPruefung.disable();
    this.loadCurrentUserRoles();

    this.reloadMessgeraeteKontext();
  }

  private reloadMessgeraeteKontext(): void {
    this.apiHttpService.get(this.modul).subscribe({
      next: (erg: any) => {
        try {
          this.messgeraete = erg;
          this.dataSource.data = erg;
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
      },
    });
  }

  neueDetails(): void {
    this.formModul.enable();
  }

  neuePruefung(): void {
    if (this.rolesResolved && !this.canEditProtocol) {
      this.uiMessageService.erstelleMessage('info', 'Nur ADMIN/PROTOKOLL dürfen Protokolle anlegen.');
      return;
    }
    this.showPruefungForm = true;
    this.formPruefung.enable();
    this.title = this.title_pruefung;
  }

  neuePruefungVonMessgeraet(element: any): void {
    if (this.rolesResolved && !this.canEditProtocol) {
      this.uiMessageService.erstelleMessage('info', 'Nur ADMIN/PROTOKOLL dürfen Protokolle anlegen.');
      return;
    }
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

    this.apiHttpService.get(abfrageUrl).subscribe({
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
          this.uiMessageService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
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
    const param = { geraet_id: element.pkid };

    this.apiHttpService.get(abfrageUrl, param, true).subscribe({
      next: (erg: any) => {
        try {
          this.showPruefungTable = true;
          this.pruefungen = erg;
          this.dataSourcePruefungen.data = this.pruefungen;
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
      },
    });
  }

  auswahlBearbeitenProtokoll(element: any): void {
    if (element.id === 0) {
      return;
    }
    const abfrageUrl = `${this.modul}/protokoll/${element.id}`;

    this.apiHttpService.get(abfrageUrl).subscribe({
      next: (erg: any) => {
        try {
          this.showPruefungTable = false;
          this.showPruefungForm = true;
          const details: IMessgeraetProtokoll = erg;
          this.formPruefung.enable();
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
          this.uiMessageService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
      },
    });
  }

  datenSpeichern(): void {
    if (this.formModul.invalid) {
      this.uiMessageService.erstelleMessage(
        'error',
        'Bitte alle Pflichtfelder korrekt ausfüllen!'
      );
      return;
    }

    const objekt: any = this.formModul.value;
    const idValue = this.formModul.controls['id'].value;

    if (!idValue) {
      this.apiHttpService.post(this.modul, objekt, false).subscribe({
        next: (erg: any) => {
          try {
            const newMask: IMessgeraet = erg;
            this.messgeraete.push(newMask);
            this.messgeraete = this.collectionUtilsService.arraySortByKey(
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
            this.uiMessageService.erstelleMessage(
              'success',
              'Messgerät gespeichert!'
            );
          } catch (e: any) {
            this.uiMessageService.erstelleMessage('error', e);
          }
        },
        error: (error: any) => this.authSessionService.errorAnzeigen(error),
      });
    } else {
      this.apiHttpService
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

              this.uiMessageService.erstelleMessage(
                'success',
                'Messgerät geändert!'
              );
            } catch (e: any) {
              this.uiMessageService.erstelleMessage('error', e);
            }
          },
          error: (error: any) => this.authSessionService.errorAnzeigen(error),
        });
    }
  }

  datenSpeichernProtokoll(): void {
    if (this.formPruefung.invalid) {
      this.uiMessageService.erstelleMessage(
        'error',
        'Bitte alle Pflichtfelder korrekt ausfüllen!'
      );
      return;
    }
    const objekt: any = this.formPruefung.getRawValue();
    const idValue = this.formPruefung.controls['id'].value;

    if (!idValue) {
      if (this.rolesResolved && !this.canEditProtocol) {
        this.uiMessageService.erstelleMessage('error', 'Nur ADMIN/PROTOKOLL dürfen Protokolle anlegen.');
        return;
      }

      this.apiHttpService
        .post(`${this.modul}/protokoll`, objekt, false)
        .subscribe({
          next: (erg: any) => {
            try {
              const newPrufung: IMessgeraetProtokoll = erg;
              this.pruefungen.push(newPrufung);
              this.pruefungen = this.collectionUtilsService.arraySortByKey(
                this.pruefungen,
                'datum'
              );
              this.dataSourcePruefungen.data = this.pruefungen;
              this.reloadMessgeraeteKontext();

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
              this.uiMessageService.erstelleMessage(
                'success',
                'Protokoll gespeichert!'
              );
            } catch (e: any) {
              this.uiMessageService.erstelleMessage('error', e);
            }
          },
          error: (error: any) => this.authSessionService.errorAnzeigen(error),
        });
    } else {
      if (this.rolesResolved && !this.canEditProtocol) {
        this.uiMessageService.erstelleMessage('error', 'Nur ADMIN/PROTOKOLL dürfen Protokolle ändern.');
        return;
      }

      this.apiHttpService
        .patch(`${this.modul}/protokoll`, idValue, objekt, false)
        .subscribe({
          next: (erg: any) => {
            try {
              const updated: any = erg;
              this.pruefungen = this.pruefungen
                .map((m) => (m.id === updated.id ? updated : m))
                .sort((a, b) => a.datum - b.datum);

              this.dataSourcePruefungen.data = this.pruefungen;
              this.reloadMessgeraeteKontext();

              this.formPruefung.reset({
                id: '',
                geraet_id: 0,
                kalibrierung: false,
                kontrolle_woechentlich: false,
                wartung_jaehrlich: false,
                name_pruefer: '',
              });
              this.formPruefung.disable();
              this.showPruefungTable = true;
              this.uiMessageService.erstelleMessage(
                'success',
                'Protokoll geändert!'
              );
            } catch (e: any) {
              this.uiMessageService.erstelleMessage('error', e);
            }
          },
          error: (error: any) => this.authSessionService.errorAnzeigen(error),
        });
    }
  }

  abbrechen(): void {
    this.uiMessageService.erstelleMessage('info', 'Messgerät nicht gespeichert!');
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
    this.uiMessageService.erstelleMessage(
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
      this.uiMessageService.erstelleMessage(
        'error',
        'Keine Maske ausgewählt zum Löschen!'
      );
      return;
    }

    this.apiHttpService.delete(this.modul, id).subscribe({
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

          this.uiMessageService.erstelleMessage(
            'success',
            'Messgerät erfolgreich gelöscht!'
          );
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
      },
    });
  }

  datenProtokollLoeschen(): void {
    if (this.rolesResolved && !this.canEditProtocol) {
      this.uiMessageService.erstelleMessage('error', 'Nur ADMIN/PROTOKOLL dürfen Protokolle löschen.');
      return;
    }

    const id = this.formPruefung.controls['id'].value!;
    if (!id) {
      this.uiMessageService.erstelleMessage(
        'error',
        'Kein Protokoll ausgewählt zum Löschen!'
      );
      return;
    }

    this.apiHttpService.delete(`${this.modul}/protokoll`, id).subscribe({
      next: (erg: any) => {
        try {
          this.pruefungen = this.pruefungen.filter((m: any) => m.id !== id);
          this.dataSourcePruefungen.data = this.pruefungen;
          this.reloadMessgeraeteKontext();

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
          this.uiMessageService.erstelleMessage(
            'success',
            'Protokoll erfolgreich gelöscht!'
          );
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
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

  jahrAusDatum(value?: string | null): string {
    const input = String(value ?? '').trim();
    if (!input) {
      return '-';
    }

    const isoMatch = /^(\d{4})-\d{2}-\d{2}$/.exec(input);
    if (isoMatch) {
      return isoMatch[1];
    }

    if (/^\d{4}$/.test(input)) {
      return input;
    }

    const parts = input.split('.');
    const yearPart = parts[parts.length - 1]?.trim();
    return /^\d{4}$/.test(yearPart) ? yearPart : input;
  }

  kwJahrAusDatum(value?: string | null): string {
    const input = String(value ?? '').trim();
    if (!input) {
      return '-';
    }

    const kwPattern = /^(?:KW\s*)?(\d{1,2})\s*[/.-]\s*(\d{4})$/i.exec(input);
    if (kwPattern) {
      return `${kwPattern[1].padStart(2, '0')}/${kwPattern[2]}`;
    }

    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]);
      const day = Number(isoMatch[3]);
      const date = new Date(year, month - 1, day);
      return this.isoWeekFromDate(date);
    }

    const deMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(input);
    if (deMatch) {
      const day = Number(deMatch[1]);
      const month = Number(deMatch[2]);
      const year = Number(deMatch[3]);
      const date = new Date(year, month - 1, day);
      return this.isoWeekFromDate(date);
    }

    return input;
  }

  private isoWeekFromDate(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${String(weekNo).padStart(2, '0')}/${d.getUTCFullYear()}`;
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

  private loadCurrentUserRoles(): void {
    this.apiHttpService.get('users/self').subscribe({
      next: (erg: any) => {
        const roles = this.extractRolesFromResponse(erg);
        if (roles.length > 0) {
          this.applyRoleState(roles);
          return;
        }
        this.loadRolesFromModulKonfiguration();
      },
      error: () => this.loadRolesFromModulKonfiguration()
    });
  }

  private loadRolesFromModulKonfiguration(): void {
    this.apiHttpService.get('modul_konfiguration').subscribe({
      next: (erg: any) => this.applyRoleState(this.extractRolesFromResponse(erg)),
      error: () => this.applyRoleState([])
    });
  }

  private extractRolesFromResponse(value: any): string[] {
    return this.normalizeRoles(value?.roles ?? value?.user?.roles ?? value?.main?.user?.roles);
  }

  private applyRoleState(roles: string[]): void {
    this.userRoles = roles;
    this.canEditProtocol = this.userRoles.includes('ADMIN') || this.userRoles.includes('PROTOKOLL');
    this.rolesResolved = true;

    if (this.showPruefungForm) {
      if (this.canEditProtocol) {
        this.formPruefung.enable();
      } else {
        this.formPruefung.disable();
      }
    }
  }

  private normalizeRoles(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .flatMap((entry: any) =>
          String(entry?.key ?? entry?.role ?? entry?.name ?? entry)
            .split(',')
            .map((part: string) => part.trim().toUpperCase())
        )
        .filter(Boolean);
    }

    return String(value ?? '')
      .split(',')
      .map((entry) => entry.trim().toUpperCase())
      .filter(Boolean);
  }
}

