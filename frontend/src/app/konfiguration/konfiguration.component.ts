import { Component, OnInit, Output, EventEmitter, inject } from '@angular/core';

import { FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
import { IKonfiguration } from 'src/app/_interface/konfiguration';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { environment } from "src/environments/environment";
import { Router } from '@angular/router';
import {
  ImrBreadcrumbItem,
  ImrHeaderComponent,
  ImrPageLayoutComponent,
  ImrSectionComponent,
} from '../imr-ui-library';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

type RolleEintrag = { id: number; key: string; verbose_name: string };
type BackupEintrag = { name: string };
type KonfigResponse = { main: IKonfiguration[]; rollen: RolleEintrag[]; backups: string[] };
type BackupOperationResponse = { msg?: string; backups?: string[] };
type BackupCleanupItem = { target?: string; orphans?: string[] };
type BackupCleanupResponse = { summary?: { orphan?: number }; deleted?: number; items?: BackupCleanupItem[] };
type EmailTestType = 'account_invite' | 'service_reminder';
type EmailTestResult = { key: string; label: string; sent: boolean };
type EmailTestResponse = { email: string; result: EmailTestResult; available_types?: Array<{ key: EmailTestType; label: string }> };

@Component({
    selector: 'app-konfiguration',
    templateUrl: './konfiguration.component.html',
    styleUrls: ['./konfiguration.component.sass'],
    imports: [
      ImrHeaderComponent,
      ImrPageLayoutComponent,
      ImrSectionComponent,
      FormsModule, 
      ReactiveFormsModule, 
      MatFormFieldModule,
      MatButtonModule,
      MatIconModule,
      MatChipsModule,
      MatInputModule, 
      MatTableModule,
      MatSelectModule
    ]
})
export class KonfigurationComponent implements OnInit {
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  router = inject(Router);
  breadcrumb: ImrBreadcrumbItem[] = [];

  title = "Rollenverwaltung";
  title2 = "Feuerwehr-Stammdaten";
  title3 = "Backups und Wiederherstellung";
  modul = "users/rolle";
  modul2 = "konfiguration";

  @Output() breadcrumbout = new EventEmitter<ImrBreadcrumbItem[]>();

  rollen: RolleEintrag[] = [];
  backups: BackupEintrag[] = [];
  backupColumns: string[] = ['name', 'actions'];
  cleanupColumns: string[] = ['target', 'filename'];
  backup_msg = "";
  cleanupTarget: 'all' | 'news' | 'homepage' | 'inventar' | 'einsatzberichte' | 'anwesenheitsliste' = 'all';
  cleanupRunning = false;
  cleanupSummary = '';
  cleanupFiles: Array<{ target: string; targetLabel: string; filename: string }> = [];
  emailTestRunning = false;
  emailTestResult: EmailTestResult | null = null;
  backupFilter = '';
  cleanupFilter = '';

  readonly emailTestTypeOptions: Array<{ key: EmailTestType; label: string }> = [
    { key: 'account_invite', label: 'Einladungs-E-Mail' },
    { key: 'service_reminder', label: 'Service-Erinnerung' },
  ];

  private readonly cleanupTargetLabels: Record<string, string> = {
    all: 'Alle Pfade',
    news: 'News',
    homepage: 'Homepage',
    inventar: 'Inventar',
    einsatzberichte: 'Einsatzberichte',
    anwesenheitsliste: 'Anwesenheitsliste',
  };

  private normalizeFilterValue(value: string): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private normalizeRoleValue(value: string | null | undefined): string {
    return String(value ?? '').trim().toUpperCase();
  }

  get roleCount(): number {
    return Array.isArray(this.rollen) ? this.rollen.length : 0;
  }

  get customRollen(): RolleEintrag[] {
    return this.rollen.filter((rolle) => rolle.key !== 'ADMIN' && rolle.key !== 'MITGLIED');
  }

  get canSaveRole(): boolean {
    const rawValue = this.formRolle.controls['rolle'].value;
    const nextRole = this.normalizeRoleValue(rawValue);
    if (!nextRole) {
      return false;
    }

    return !this.rollen.some((rolle) => this.normalizeRoleValue(rolle.key) === nextRole);
  }

  get hasConfigRecord(): boolean {
    return Boolean(this.formKonfig.controls['id'].value);
  }

  get filteredBackups(): Array<{ name: string }> {
    const query = this.normalizeFilterValue(this.backupFilter);
    if (!query) {
      return this.backups;
    }

    return this.backups.filter((backup) =>
      String(backup?.name ?? '').toLowerCase().includes(query),
    );
  }

  get filteredCleanupFiles(): Array<{ target: string; targetLabel: string; filename: string }> {
    const query = this.normalizeFilterValue(this.cleanupFilter);
    if (!query) {
      return this.cleanupFiles;
    }

    return this.cleanupFiles.filter((item) => {
      const haystack = `${item.targetLabel} ${item.filename}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  formRolle = new FormGroup({
    rolle: new FormControl('')
  });

  emailTestControl = new FormControl('', [Validators.required, Validators.email]);
  emailTestTypeControl = new FormControl<EmailTestType>('account_invite', {
    nonNullable: true,
    validators: [Validators.required],
  });

  formKonfig = new FormGroup({
    id: new FormControl(''),
    fw_nummer: new FormControl('', Validators.required),
    fw_name: new FormControl('', Validators.required),
    fw_street: new FormControl('', Validators.required),
    fw_plz: new FormControl('', Validators.required),
    fw_ort: new FormControl('', Validators.required),
    fw_email: new FormControl('', Validators.required),
    fw_telefon: new FormControl('', Validators.required),
    fw_kdt: new FormControl('', Validators.required),
    fw_webseite: new FormControl('', Validators.required),
    fw_konto: new FormControl('', Validators.required),
    fw_iban: new FormControl('', Validators.required),
    fw_bic: new FormControl('', Validators.required)
  });

  ngOnInit(): void {
    sessionStorage.setItem("PageNumber", "2");
    sessionStorage.setItem("Page2", "V_KO");
    this.breadcrumb = this.navigationService.ladeBreadcrumb();
    this.formRolle.disable();
    this.formKonfig.disable();

    this.apiHttpService.get<KonfigResponse>(this.modul2).subscribe({
      next: (erg) => {
        try {
          this.formRolle.enable();
          this.formKonfig.enable();

          if (erg.main.length > 0){
            const details: IKonfiguration = erg.main[0];
            this.formKonfig.setValue({
              id: details.id,
              fw_nummer: details.fw_nummer,
              fw_name: details.fw_name,
              fw_street: details.fw_street,
              fw_plz: details.fw_plz,
              fw_ort: details.fw_ort,
              fw_email: details.fw_email,
              fw_telefon: details.fw_telefon,
              fw_kdt: details.fw_kdt,
              fw_webseite: details.fw_webseite,
              fw_konto: details.fw_konto,
              fw_iban: details.fw_iban,
              fw_bic: details.fw_bic
            })

            if (!String(this.emailTestControl.value || '').trim()) {
              this.emailTestControl.setValue(details.fw_email || '');
            }
          }
          this.rollen = erg.rollen;
          this.backups = this.convertBackups(erg.backups);
        } catch (e: unknown) {
          this.uiMessageService.erstelleMessage("error", String(e));
        }
      },
      error: (error: unknown) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  rolleSpeichern(): void {
    const rolle_neu = this.normalizeRoleValue(this.formRolle.controls['rolle'].value);
    if (!rolle_neu || !this.canSaveRole) {
      return;
    }

    const post = {
      "key": rolle_neu,
      "verbose_name": rolle_neu
    }


    this.apiHttpService.post<RolleEintrag>(this.modul, post, false).subscribe({
      next: (erg: RolleEintrag) => {
        try {
          this.formRolle.reset();
          if (!this.rollen.find((r) => r.key === erg.key)) {
            this.rollen.push(erg);
          }
          this.uiMessageService.erstelleMessage("success","Rolle erfolgreich gespeichert!");
        } catch (e: unknown) {
          this.uiMessageService.erstelleMessage("error", String(e));
        }
      },
      error: (error: unknown) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  rolleLoeschen(rolle: RolleEintrag): void {
    const id = rolle.id;
    this.apiHttpService.delete(this.modul, id).subscribe({
      next: () => {
        try {
          this.rollen = this.rollen.filter((r) => r.id !== id);
          this.uiMessageService.erstelleMessage("success", "Rolle erfolgreich gelöscht!");
        } catch (e: unknown) {
          this.uiMessageService.erstelleMessage("error", String(e));
        }
      },
      error: (error: unknown) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  konfigSpeichern(): void {
    const object = this.formKonfig.value;

    const idValue = this.formKonfig.controls["id"].value;
    if (idValue === '' || idValue === null) {
      this.apiHttpService.post<IKonfiguration>(this.modul2, object, false).subscribe({
        next: (erg) => {
          try {
            const details: IKonfiguration = erg;
            this.formKonfig.setValue({
              id: details.id,
              fw_nummer: details.fw_nummer,
              fw_name: details.fw_name,
              fw_street: details.fw_street,
              fw_plz: details.fw_plz,
              fw_ort: details.fw_ort,
              fw_email: details.fw_email,
              fw_telefon: details.fw_telefon,
              fw_kdt: details.fw_kdt,
              fw_webseite: details.fw_webseite,
              fw_konto: details.fw_konto,
              fw_iban: details.fw_iban,
              fw_bic: details.fw_bic
            })
            this.uiMessageService.erstelleMessage("success","Konfiguration erfolgreich gespeichert!");
          } catch (e: unknown) {
            this.uiMessageService.erstelleMessage("error", String(e));
          }
        },
        error: (error: unknown) => {
          this.authSessionService.errorAnzeigen(error);
        }
      });
    } else {
      this.apiHttpService.patch<IKonfiguration>(this.modul2, idValue, object, false).subscribe({
        next: (erg) => {
          try {
            const details: IKonfiguration = erg;
            this.formKonfig.setValue({
              id: details.id,
              fw_nummer: details.fw_nummer,
              fw_name: details.fw_name,
              fw_street: details.fw_street,
              fw_plz: details.fw_plz,
              fw_ort: details.fw_ort,
              fw_email: details.fw_email,
              fw_telefon: details.fw_telefon,
              fw_kdt: details.fw_kdt,
              fw_webseite: details.fw_webseite,
              fw_konto: details.fw_konto,
              fw_iban: details.fw_iban,
              fw_bic: details.fw_bic
            })
            this.uiMessageService.erstelleMessage("success","Konfiguration erfolgreich geändert!");
          } catch (e: unknown) {
            this.uiMessageService.erstelleMessage("error", String(e));
          }
        },
        error: (error: unknown) => {
          this.authSessionService.errorAnzeigen(error);
        }
      });
    }
  }

  backupImport(backup_name: BackupEintrag): void {
    const object = {
      "backup": backup_name.name
    }

    this.apiHttpService.post<BackupOperationResponse>("backup/restore", object, false).subscribe({
      next: (erg) => {
        try {
          this.backup_msg = erg.msg ?? '';
          this.uiMessageService.erstelleMessage("success",this.backup_msg);
          sessionStorage.clear();
          document.cookie.split('; ').forEach(cookie => {
            const [name] = cookie.split('=');
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          });
          this.router.navigate(['/login']);
        } catch (e: unknown) {
          this.uiMessageService.erstelleMessage("error", String(e));
        }
      },
      error: (error: unknown) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  backupErstellen(): void {
    this.apiHttpService.post<BackupOperationResponse>("backup", {}, false).subscribe({
      next: (erg) => {
        try {
          this.backup_msg = erg.msg ?? '';
          this.backups = this.convertBackups(erg.backups ?? []);
          this.uiMessageService.erstelleMessage("success",this.backup_msg);
        } catch (e: unknown) {
          this.uiMessageService.erstelleMessage("error", String(e));
        }
      },
      error: (error: unknown) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  backupDownload(backup_name: BackupEintrag): void {
    const object = {
      "backup": backup_name.name
    }

    this.apiHttpService.postBlob("backup/file", object).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = backup_name.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      },
      error: (error: unknown) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  backupLoeschen(backup_name: BackupEintrag): void {
    const object = {
      "backup": backup_name.name
    }

    this.apiHttpService.post<BackupOperationResponse>("backup/delete", object, false).subscribe({
      next: (erg) => {
        try {
          this.backup_msg = erg.msg ?? '';
          this.backups = this.convertBackups(erg.backups ?? []);
          this.uiMessageService.erstelleMessage("success",this.backup_msg);
        } catch (e: unknown) {
          this.uiMessageService.erstelleMessage("error", String(e));
        }
      },
      error: (error: unknown) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  mediaCleanup(deleteFiles: boolean): void {
    if (this.cleanupRunning) {
      return;
    }

    this.cleanupRunning = true;
    const payload = {
      target: this.cleanupTarget,
      delete: deleteFiles,
    };

    this.apiHttpService.cleanupOrphanMedia(payload).subscribe({
      next: (erg) => {
        const cleanupResponse = erg as BackupCleanupResponse;
        const summary = cleanupResponse?.summary ?? {};
        const orphanCount = summary.orphan ?? 0;
        const deletedCount = cleanupResponse?.deleted ?? 0;
        this.cleanupSummary = `Ergebnis: ${orphanCount} verwaist gefunden, ${deletedCount} gelöscht.`;
        this.cleanupFiles = [];

        for (const item of (cleanupResponse?.items ?? [])) {
          const target = String(item?.target ?? '');
          for (const orphan of (item?.orphans ?? [])) {
            this.cleanupFiles.push({
              target,
              targetLabel: this.getCleanupTargetLabel(target),
              filename: orphan,
            });
          }
        }

        const message = `Medien bereinigt: ${deletedCount} gelöscht, ${orphanCount} verwaist gefunden.`;
        this.uiMessageService.erstelleMessage('success', message);
        this.cleanupRunning = false;
      },
      error: (error: unknown) => {
        this.authSessionService.errorAnzeigen(error);
        this.cleanupRunning = false;
      }
    });
  }

  sendEmailTests(): void {
    const email = String(this.emailTestControl.value || '').trim();
    const emailType = this.emailTestTypeControl.value;
    if (!email || this.emailTestControl.invalid || !emailType || this.emailTestTypeControl.invalid || this.emailTestRunning) {
      this.emailTestControl.markAsTouched();
      this.emailTestTypeControl.markAsTouched();
      this.uiMessageService.erstelleMessage('error', 'Bitte eine gültige E-Mail-Adresse für den Test angeben.');
      return;
    }

    this.emailTestRunning = true;
    this.apiHttpService.post<EmailTestResponse>(`${this.modul2}/test-emails`, { email, email_type: emailType }, false).subscribe({
      next: (response) => {
        this.emailTestResult = response.result || null;

        if (response.result?.sent) {
          this.uiMessageService.erstelleMessage('success', `${response.result.label} wurde an ${response.email} versendet.`);
        } else {
          this.uiMessageService.erstelleMessage('info', `${response.result?.label || 'Test-E-Mail'} konnte nicht an ${response.email} versendet werden.`);
        }
      },
      error: (error: unknown) => {
        this.authSessionService.errorAnzeigen(error);
      },
      complete: () => {
        this.emailTestRunning = false;
      }
    });
  }

  getCleanupTargetLabel(target: string): string {
    return this.cleanupTargetLabels[target] ?? target;
  }

  convertBackups(backup_array: string[]): BackupEintrag[] {
    const version = environment.version;
    let data: BackupEintrag[] = [];
    for (let i = 0; i < backup_array.length; i++) {
      const file = backup_array[i];
      const backup_version = file.split('_')[1];

      if (backup_version === version || backup_version === 'test') {
        const dict = {
          "name": file,
        }
        data.push(dict);
      }
    }
    data = this.collectionUtilsService.arraySortByKeyDesc(data, "name");
    return data;
  }
}

