import { Component, OnInit, inject } from '@angular/core';

import { FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IBenutzer } from 'src/app/_interface/benutzer';
import { GlobalDataService } from 'src/app/_service/global-data.service';
import { HeaderComponent } from '../_template/header/header.component';
import { MatCardModule } from '@angular/material/card';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-user',
    templateUrl: './user.component.html',
    styleUrls: ['./user.component.sass'],
    imports: [
    HeaderComponent,
    MatCardModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatButton,
    MatInput,
    MatError,
    MatCheckbox
]
})
export class UserComponent implements OnInit {
  globalDataService = inject(GlobalDataService);
  router = inject(Router);

  title = "Benutzer Verwaltung";
  modul = "users";
  username = "";

  benutzer: IBenutzer[] = [];
  breadcrumb: any = [];
  rollen: any = [];

  private normalizeRoleKeys(raw: any): string[] {
    let values: any[] = [];

    if (Array.isArray(raw)) {
      values = raw;
    } else if (typeof raw === 'string') {
      values = raw.split(',').map((v) => v.trim()).filter((v) => v !== '');
    } else if (raw && typeof raw === 'object') {
      values = [raw];
    }

    const extracted = values
      .map((entry: any) => {
        if (typeof entry === 'string') return entry.trim();
        if (entry && typeof entry === 'object') return String(entry.key ?? entry.id ?? '').trim();
        return '';
      })
      .filter((v: string) => v !== '');

    const allowed = new Set((this.rollen || []).map((r: any) => String(r.key || '').trim()).filter((k: string) => k !== ''));
    const filtered = extracted.filter((key: string) => allowed.size === 0 || allowed.has(key));

    return Array.from(new Set(filtered));
  }

  formAuswahl = new FormGroup({
    benutzer: new FormControl(0)
  });

  formModul = new FormGroup({
    id: new FormControl(''),
    username: new FormControl('', Validators.required),
    first_name: new FormControl('', Validators.required),
    last_name: new FormControl('', Validators.required),
    roles: new FormControl<string[]>([]),
    password1: new FormControl('', Validators.minLength(8)),
    password2: new FormControl('',Validators.minLength(8))
  });

  ngOnInit(): void {
    sessionStorage.setItem("PageNumber", "2");
    sessionStorage.setItem("Page2", "V_B");
    this.breadcrumb = this.globalDataService.ladeBreadcrumb();
    this.formModul.disable();

    forkJoin({
      usersResponse: this.globalDataService.get<any>(this.modul),
      contextResponse: this.globalDataService.get<any>(`${this.modul}/context`),
    }).subscribe({
      next: ({ usersResponse, contextResponse }) => {
        try {
          this.benutzer = usersResponse.data;
          this.rollen = contextResponse.data.rollen;
          this.benutzer = this.globalDataService.arraySortByKey(this.benutzer, 'username');
        } catch (e: any) {
          this.globalDataService.erstelleMessage("error", e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      }
    });
  }

  auswahlBearbeiten(): void {
    const id = this.formAuswahl.controls["benutzer"].value;
    if (id == 0) {
      return;
    }
    const abfrageUrl = this.modul + "/" + id;

    this.globalDataService.get(abfrageUrl).subscribe({
      next: (erg: any) => {
        try {
          const details: IBenutzer = erg.data.user;
          this.username = details.username;
          this.formModul.enable();
          const normalizedRoles = this.normalizeRoleKeys(details.roles);
          this.formModul.setValue({
            id: details.id,
            username: details.username,
            first_name: details.first_name,
            last_name: details.last_name,
            roles: normalizedRoles,
            password1: "",
            password2: ""
          })

          this.setzeSelectZurueck();
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
    this.setzeSelectZurueck();
  }

  datenLoeschen(): void {
    const id = this.formModul.controls["id"].value!;

    this.globalDataService.delete(this.modul, id).subscribe({
      next: (erg: any) => {
        try {
          const data = this.benutzer;
          const dataNew: any[] = [];
          for (let i = 0; i < data.length; i++) {
            if (data[i].id !== id) {
              dataNew.push(data[i]);
            }
          }
          this.username = "";
          this.benutzer = dataNew;
          this.formModul.reset({ username: '', first_name: '', last_name: '', roles: [], password1: '', password2: '' });
          this.formModul.disable();
          this.setzeSelectZurueck();
          this.globalDataService.erstelleMessage("success","Benutzer erfolgreich gelöscht!");
        } catch (e: any) {
          this.globalDataService.erstelleMessage("error", e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      }
    });
  }

  abbrechen(): void {
    this.globalDataService.erstelleMessage("info", "Benutzer nicht gespeichert!");
    this.router.navigate(['/benutzer']);
  }

  datenSpeichern(): void {
    const rollen = this.normalizeRoleKeys(this.formModul.controls["roles"].value);

    if (!rollen.includes("ADMIN") && !rollen.includes("MITGLIED")) {
      rollen.push("MITGLIED");
    }

    this.formModul.controls["roles"].setValue([...rollen]);

    const idValue = this.formModul.controls["id"].value;
    const payloadCreate = {
      id: this.formModul.controls["id"].value || '',
      username: this.formModul.controls["username"].value || '',
      first_name: this.formModul.controls["first_name"].value || '',
      last_name: this.formModul.controls["last_name"].value || '',
      roles: rollen,
      password1: this.formModul.controls["password1"].value || '',
      password2: this.formModul.controls["password2"].value || ''
    };

    const payloadUpdate = {
      id: this.formModul.controls["id"].value || '',
      username: this.formModul.controls["username"].value || '',
      first_name: this.formModul.controls["first_name"].value || '',
      last_name: this.formModul.controls["last_name"].value || '',
      roles: rollen,
    };

    if (idValue === '' || idValue === null) {
      if (this.formModul.controls["password1"].value == "" || this.formModul.controls["password1"].value == "") {
        this.globalDataService.erstelleMessage("error", "Passwort 1 & 2 müssen ausgefüllt sein!");
        return
      }else if (this.formModul.controls["password1"].value !== "" && this.formModul.controls["password2"].value !== "" && this.formModul.controls["password1"].value !== this.formModul.controls["password2"].value) {
        this.globalDataService.erstelleMessage("error", "Die Passwörter müssen übereinstimmen!");
        return
      }
      this.globalDataService.post("users/create", payloadCreate, false).subscribe({
        next: (erg: any) => {
          try {
            this.username = "";
            this.benutzer.push(erg.user);
            this.formModul.reset({ username: '', first_name: '', last_name: '', roles: [], password1: '', password2: '' });
            this.formModul.disable();
            this.setzeSelectZurueck();
            this.globalDataService.erstelleMessage("success","Benutzer erfolgreich gespeichert!");
          } catch (e: any) {
            this.globalDataService.erstelleMessage("error", e);
          }
        },
        error: (error: any) => {
          this.globalDataService.errorAnzeigen(error);
        }
      });
    } else {
      this.globalDataService.patch(this.modul, idValue, payloadUpdate, false).subscribe({
        next: (erg: any) => {
          try {
            const data = this.benutzer;
            const dataNew: any[] = [];
            for (let i = 0; i < data.length; i++) {
              if (data[i].id == erg.data.id) {
                dataNew.push(erg.data);
              } else {
                dataNew.push(data[i]);
              }
            }
            this.username = "";
            this.benutzer = dataNew;
            this.formModul.reset({ username: '', first_name: '', last_name: '', roles: [], password1: '', password2: '' });
            this.formModul.disable();
            this.globalDataService.erstelleMessage("success","Benutzer erfolgreich geändert!");
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

  setzeSelectZurueck(): void {
    this.formAuswahl.controls["benutzer"].setValue(0, { onlySelf: true });
  }

  passwortAendern(): void {
    if (this.formModul.controls["password1"].value !== "" && this.formModul.controls["password2"].value !== "" && this.formModul.controls["password1"].value !== this.formModul.controls["password2"].value) {
      this.globalDataService.erstelleMessage("error","Die Passwörter müssen übereinstimmen!");
      return
    }
    const dict = {
      "password": this.formModul.controls["password1"].value
    }
    const idValue = this.formModul.controls["id"].value!;
    this.globalDataService.patch("users/change_password", idValue, dict, false).subscribe({
      next: (erg: any) => {
        try {
          this.formModul.controls["password1"].setValue("");
          this.formModul.controls["password2"].setValue("");
          this.globalDataService.erstelleMessage("success","User Passwort erfolgreich geändert!");
        } catch (e: any) {
          this.globalDataService.erstelleMessage("error", e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      }
    });
  }

  rolleToggle(key: string, event: any): void {
    const current = this.normalizeRoleKeys(this.formModul.controls["roles"].value);

    if (event.checked && !current.includes(key)) {
      this.formModul.controls["roles"].setValue([...current, key]);
    } else if (!event.checked) {
      this.formModul.controls["roles"].setValue(current.filter(r => r !== key));
    }
  }
}
