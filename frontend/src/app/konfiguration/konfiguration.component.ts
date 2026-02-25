import { Component, OnInit, Output, EventEmitter, inject } from '@angular/core';

import { FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GlobalDataService } from 'src/app/_service/global-data.service';
import { IKonfiguration } from 'src/app/_interface/konfiguration';
import { MatCardModule } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { environment } from "src/environments/environment";
import { Router } from '@angular/router';
import { HeaderComponent } from '../_template/header/header.component';
import { MatChipsModule } from '@angular/material/chips';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

@Component({
    selector: 'app-konfiguration',
    templateUrl: './konfiguration.component.html',
    styleUrls: ['./konfiguration.component.sass'],
    imports: [HeaderComponent, MatCardModule, FormsModule, ReactiveFormsModule, MatButton, MatFormField, MatLabel, MatInput, MatError, MatIconModule, MatChipsModule, MatSelect, MatOption, MatTableModule]
})
export class KonfigurationComponent implements OnInit {
  globalDataService = inject(GlobalDataService);
  router = inject(Router);
  breadcrumb: any = [];

  title = "Aktive Rollen";
  title2 = "Stammdaten";
  title3 = "Backup & Wiederherstellen";
  modul = "users/rolle";
  modul2 = "konfiguration";

  @Output() breadcrumbout = new EventEmitter<any[]>();

  rollen: any = []
  backups: any = [];
  backupColumns: string[] = ['name', 'actions'];
  backup_msg = "";
  cleanupTarget: 'all' | 'news' | 'inventar' = 'all';
  cleanupRunning = false;
  cleanupSummary = '';
  cleanupFiles: Array<{ target: string; filename: string }> = [];

  formRolle = new FormGroup({
    rolle: new FormControl('')
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
    this.breadcrumb = this.globalDataService.ladeBreadcrumb();
    this.formRolle.disable();
    this.formKonfig.disable();

    this.globalDataService.get(this.modul2).subscribe({
      next: (erg: any) => {
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
          }
          this.rollen = erg.rollen;
          this.backups = this.convertBackups(erg.backups);
        } catch (e: any) {
          this.globalDataService.erstelleMessage("error", e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      }
    });
  }

  rolleSpeichern(): void {
    const object = this.formRolle.value;
    const rolle_neu = object.rolle;

    const post = {
      "key": rolle_neu,
      "verbose_name": rolle_neu
    }


    this.globalDataService.post(this.modul, post, false).subscribe({
      next: (erg: any) => {
        try {
          this.formRolle.reset();
          if (!this.rollen.find((r: any) => r.key === erg.key)) {
            this.rollen.push(erg);
          }
          this.globalDataService.erstelleMessage("success","Rolle erfolgreich gespeichert!");
        } catch (e: any) {
          this.globalDataService.erstelleMessage("error", e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      }
    });
  }

  rolleLoeschen(rolle: any): void {
    const id = rolle.id;
    this.globalDataService.delete(this.modul, id).subscribe({
      next: (erg: any) => {
        try {
          this.rollen = this.rollen.filter((r: any) => r.id !== id);
          this.globalDataService.erstelleMessage("success", "Rolle erfolgreich gelöscht!");
        } catch (e: any) {
          this.globalDataService.erstelleMessage("error", e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      }
    });
  }

  konfigSpeichern(): void {
    const object = this.formKonfig.value;

    const idValue = this.formKonfig.controls["id"].value;
    if (idValue === '' || idValue === null) {
      this.globalDataService.post(this.modul2, object, false).subscribe({
        next: (erg: any) => {
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
            this.globalDataService.erstelleMessage("success","Konfiguration erfolgreich gespeichert!");
          } catch (e: any) {
            this.globalDataService.erstelleMessage("error", e);
          }
        },
        error: (error: any) => {
          this.globalDataService.errorAnzeigen(error);
        }
      });
    } else {
      this.globalDataService.patch(this.modul2, idValue, object, false).subscribe({
        next: (erg: any) => {
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
            this.globalDataService.erstelleMessage("success","Konfiguration erfolgreich geändert!");
          } catch (e: any) {
            this.globalDataService.erstelleMessage("error", e);
          }
        },
        error: (error: any) => {
          this.globalDataService.errorAnzeigen(error);
        }
      });
    }
  }

  backupImport(backup_name: any): void {
    const object = {
      "backup": backup_name.name
    }

    this.globalDataService.post("backup/restore", object, false).subscribe({
      next: (erg: any) => {
        try {
          this.backup_msg = erg.msg;
          this.globalDataService.erstelleMessage("success",this.backup_msg);
          sessionStorage.clear();
          document.cookie.split('; ').forEach(cookie => {
            const [name] = cookie.split('=');
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          });
          this.router.navigate(['/login']);
        } catch (e: any) {
          this.globalDataService.erstelleMessage("error", e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      }
    });
  }

  backupErstellen(): void {
    this.globalDataService.post("backup", {}, false).subscribe({
      next: (erg: any) => {
        try {
          this.backup_msg = erg.msg;
          this.backups = this.convertBackups(erg.backups);
          this.globalDataService.erstelleMessage("success",this.backup_msg);
        } catch (e: any) {
          this.globalDataService.erstelleMessage("error", e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      }
    });
  }

  backupDownload(backup_name: any): void {
    const object = {
      "backup": backup_name.name
    }

    this.globalDataService.postBlob("backup/file", object).subscribe({
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
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      }
    });
  }

  backupLoeschen(backup_name: any): void {
    const object = {
      "backup": backup_name.name
    }

    this.globalDataService.post("backup/delete", object, false).subscribe({
      next: (erg: any) => {
        try {
          this.backup_msg = erg.msg;
          this.backups = this.convertBackups(erg.backups);
          this.globalDataService.erstelleMessage("success",this.backup_msg);
        } catch (e: any) {
          this.globalDataService.erstelleMessage("error", e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
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

    this.globalDataService.cleanupOrphanMedia(payload).subscribe({
      next: (erg: any) => {
        const summary = erg?.summary ?? {};
        const orphanCount = summary.orphan ?? 0;
        const deletedCount = erg?.deleted ?? 0;
        this.cleanupSummary = `Ergebnis: ${orphanCount} verwaist gefunden, ${deletedCount} gelöscht.`;
        this.cleanupFiles = [];

        for (const item of (erg?.items ?? [])) {
          for (const orphan of (item?.orphans ?? [])) {
            this.cleanupFiles.push({
              target: item.target,
              filename: orphan,
            });
          }
        }

        const message = `Medien bereinigt: ${deletedCount} gelöscht, ${orphanCount} verwaist gefunden.`;
        this.globalDataService.erstelleMessage('success', message);
        this.cleanupRunning = false;
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
        this.cleanupRunning = false;
      }
    });
  }

  convertBackups(backup_array:any ): any {
    const version = environment.version;
    let data = [];
    for (let i = 0; i < backup_array.length; i++) {
      const file = backup_array[i];
      let backup_version = file.split('_');
      backup_version = backup_version[1];

      if (backup_version == version || backup_version == 'test') {
        const dict = {
          "name": file,
        }
        data.push(dict);
      }
    }
    data = this.globalDataService.arraySortByKeyDesc(data, "name");
    return data;
  }
}
