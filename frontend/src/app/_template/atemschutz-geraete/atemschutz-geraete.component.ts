import { Component, OnInit, inject } from '@angular/core';
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
import { ImrCardContentComponent, ImrHeaderComponent } from '../../imr-ui-library';
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
import { DateInputMaskDirective } from '../../_directive/date-input-mask.directive';

@Component({
  selector: 'app--atemschutzgeraete',
  imports: [
    ImrHeaderComponent,
    ImrCardContentComponent,
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
    DateInputMaskDirective,
  ],
  templateUrl: './atemschutz-geraete.component.html',
  styleUrl: './atemschutz-geraete.component.sass'
})
export class AtemschutzGeraeteComponent implements OnInit {
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  title = "Geräte verwalten";
  title_modul = this.title;
  title_pruefung = "Geräte prüfen";
  modul = "atemschutz/geraete";
  showPruefungForm: boolean = false;
  showPruefungTable: boolean = false;

  geraete: IAtemschutzGeraet[] = [];
  pruefungen: IAtemschutzGeraetProtokoll[] = [];
  mitglieder: IMitglied[] = [];
  userRoles: string[] = [];
  canEditProtocol = false;
  rolesResolved = false;
  breadcrumb: any = [];
  dataSource = new MatTableDataSource<IAtemschutzGeraet>(this.geraete);
  dataSourcePruefungen = new MatTableDataSource<IAtemschutzGeraetProtokoll>(this.pruefungen);
  sichtbareSpalten: string[] = ['inv_nr', 'typ', 'art', 'standort', 'letzte_pruefung', 'naechste_pruefung', 'actions'];
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
    this.breadcrumb = this.navigationService.ladeBreadcrumb();
    this.formModul.disable();
    this.formPruefung.disable();
    this.loadCurrentUserRoles();

    this.reloadGeraeteKontext();
  }

  private reloadGeraeteKontext(): void {
    this.apiHttpService.get(this.modul).subscribe({
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
          this.mitglieder = this.collectionUtilsService.arraySortByKey(this.mitglieder, 'stbnr');
        } catch (e: any) {
          this.uiMessageService.erstelleMessage("error", e);
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
      }
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

  neuePruefungVonMaske(element: any): void {
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
          this.uiMessageService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
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
      }
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

          this.formPruefung.enable();
          if (this.rolesResolved && !this.canEditProtocol) {
            this.applyNoteOnlyMode();
          }
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  datenSpeichern(): void {
    if (this.formModul.invalid) {
      this.uiMessageService.erstelleMessage('error', 'Bitte alle Pflichtfelder korrekt ausfüllen!');
      return;
    }

    const objekt: any = this.formModul.value;
    const idValue = this.formModul.controls['id'].value;

    if (!idValue) {
      this.apiHttpService.post(this.modul, objekt, false).subscribe({
        next: (erg: any) => {
          try {
            const newMask: IAtemschutzGeraet = erg;

            this.geraete.push(newMask);
            this.geraete = this.collectionUtilsService.arraySortByKey(this.geraete, 'inv_nr');
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
            this.uiMessageService.erstelleMessage('success', 'Gerät gespeichert!');
          } catch (e: any) {
            this.uiMessageService.erstelleMessage('error', e);
          }
        },
        error: (error: any) => this.authSessionService.errorAnzeigen(error)
      });
    } else {
      this.apiHttpService.patch(this.modul, idValue, objekt, false).subscribe({
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

            this.uiMessageService.erstelleMessage('success', 'Gerät geändert!');
          } catch (e: any) {
            this.uiMessageService.erstelleMessage('error', e);
          }
        },
        error: (error: any) => this.authSessionService.errorAnzeigen(error)
      });
    }
  }

  datenSpeichernProtokoll(): void {
    if (this.formPruefung.invalid) {
      this.uiMessageService.erstelleMessage('error', 'Bitte alle Pflichtfelder korrekt ausfüllen!');
      return;
    }
    const idValue = this.formPruefung.controls['id'].value;

    if (!idValue) {
      if (this.rolesResolved && !this.canEditProtocol) {
        this.uiMessageService.erstelleMessage('error', 'Nur ADMIN/PROTOKOLL dürfen Protokolle anlegen.');
        return;
      }

      const objekt: any = this.formPruefung.getRawValue();
      if (objekt.mitglied_id == 0) {
        objekt.mitglied_id = null;
      }

      this.apiHttpService.post(`${this.modul}/protokoll`, objekt, false).subscribe({
        next: (erg: any) => {
          try {
            const newPrufung: IAtemschutzGeraetProtokoll = erg;
            this.pruefungen.push(newPrufung);
            this.pruefungen = this.collectionUtilsService.arraySortByKey(this.pruefungen, 'datum');
            this.dataSourcePruefungen.data = this.pruefungen;
            this.reloadGeraeteKontext();

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
            this.uiMessageService.erstelleMessage('success', 'Protokoll gespeichert!');
          } catch (e: any) {
            this.uiMessageService.erstelleMessage('error', e);
          }
        },
        error: (error: any) => this.authSessionService.errorAnzeigen(error)
      });
    } else {
      const objekt: any = this.canEditProtocol
        ? this.formPruefung.getRawValue()
        : { notiz: this.formPruefung.controls['notiz'].value ?? '' };
      
      if (objekt.mitglied_id == 0) {
        objekt.mitglied_id = null;
      }

      this.apiHttpService.patch(`${this.modul}/protokoll`, idValue, objekt, false).subscribe({
        next: (erg: any) => {
          try {
            const updated: any = erg;
            this.pruefungen = this.pruefungen
              .map(m => m.id === updated.id ? updated : m)
              .sort((a, b) => a.datum - b.datum);

            this.dataSourcePruefungen.data = this.pruefungen;
            this.reloadGeraeteKontext();

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
            this.showPruefungTable = true;
            this.uiMessageService.erstelleMessage('success', 'Protokoll geändert!');
          } catch (e: any) {
            this.uiMessageService.erstelleMessage('error', e);
          }
        },
        error: (error: any) => this.authSessionService.errorAnzeigen(error)
      });
    }
  }

  abbrechen(): void {
    this.uiMessageService.erstelleMessage("info", "Gerät nicht gespeichert!");
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
    this.uiMessageService.erstelleMessage("info", "Prüfung nicht gespeichert!");
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
      this.uiMessageService.erstelleMessage('error', 'Keine Gerät ausgewählt zum Löschen!');
      return;
    }

    this.apiHttpService.delete(this.modul, id).subscribe({
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

          this.uiMessageService.erstelleMessage('success', 'Gerät erfolgreich gelöscht!');
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  datenProtokollLoeschen(): void {
    if (this.rolesResolved && !this.canEditProtocol) {
      this.uiMessageService.erstelleMessage('error', 'Nur ADMIN/PROTOKOLL dürfen Protokolle löschen.');
      return;
    }

    const id = this.formPruefung.controls['id'].value!;
    if (!id) {
      this.uiMessageService.erstelleMessage('error', 'Kein Protokoll ausgewählt zum Löschen!');
      return;
    }

    this.apiHttpService.delete(`${this.modul}/protokoll`, id).subscribe({
      next: (erg: any) => {
        try {
          this.pruefungen = this.pruefungen.filter((m: any) => m.id !== id);
          this.dataSourcePruefungen.data = this.pruefungen;
          this.reloadGeraeteKontext();

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
          this.uiMessageService.erstelleMessage('success', 'Protokoll erfolgreich gelöscht!');
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
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

  monatJahrAusDatum(value?: string | null): string {
    const input = String(value ?? '').trim();
    if (!input) {
      return '-';
    }

    if (/^\d{2}\.\d{4}$/.test(input)) {
      return input;
    }

    const isoMatch = /^(\d{4})-(\d{2})-\d{2}$/.exec(input);
    if (isoMatch) {
      return `${isoMatch[2]}.${isoMatch[1]}`;
    }

    const parts = input.split('.');
    if (parts.length >= 3 && /^\d{4}$/.test(parts[2])) {
      const month = parts[1]?.padStart(2, '0');
      if (/^\d{2}$/.test(month)) {
        return `${month}.${parts[2]}`;
      }
    }

    return input;
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
        this.applyNoteOnlyMode();
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

  private applyNoteOnlyMode(): void {
    Object.values(this.formPruefung.controls).forEach((control) => {
      control.disable();
    });
    this.formPruefung.controls['notiz'].enable();
  }
}
