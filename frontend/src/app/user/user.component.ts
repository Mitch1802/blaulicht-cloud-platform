import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';

import { FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IBenutzer } from 'src/app/_interface/benutzer';
import { GlobalDataService } from 'src/app/_service/global-data.service';
import { HeaderComponent } from '../_template/header/header.component';
import { MatCardModule } from '@angular/material/card';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import { forkJoin } from 'rxjs';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';

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
    MatButton,
    MatInput,
    MatError,
    MatCheckbox,
    MatTableModule,
    MatPaginatorModule,
    MatSort,
    MatIconModule
]
})
export class UserComponent implements OnInit {
  globalDataService = inject(GlobalDataService);
  breakpointObserver = inject(BreakpointObserver);
  destroyRef = inject(DestroyRef);

  title = "Benutzer Verwaltung";
  modul = "users";
  username = "";

  dataSource = new MatTableDataSource<IBenutzer>([]);

  @ViewChild(MatPaginator) set matPaginator(p: MatPaginator | undefined) {
    if (p) this.dataSource.paginator = p;
  }

  @ViewChild(MatSort) set matSort(s: MatSort | undefined) {
    if (s) this.dataSource.sort = s;
  }

  benutzer: IBenutzer[] = [];
  breadcrumb: any = [];
  rollen: any = [];
  private readonly desktopSpaltenBenutzer = ['username', 'first_name', 'last_name', 'rolle', 'actions'];
  private readonly mobileSpaltenBenutzer = ['username', 'rolle', 'actions'];
  sichtbareSpaltenBenutzer: string[] = [...this.desktopSpaltenBenutzer];

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
    this.observeViewport();

    forkJoin({
      usersResponse: this.globalDataService.get<any>(this.modul),
      contextResponse: this.globalDataService.get<any>(`${this.modul}/context`),
    }).subscribe({
      next: ({ usersResponse, contextResponse }) => {
        try {
          this.benutzer = usersResponse.data;
          this.rollen = contextResponse.data.rollen;
          this.benutzer = this.globalDataService.arraySortByKey(this.benutzer, 'username');
          this.dataSource.data = this.benutzer;
        } catch (e: any) {
          this.globalDataService.erstelleMessage("error", e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      }
    });
  }

  private observeViewport(): void {
    this.breakpointObserver
      .observe('(max-width: 768px)')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        this.sichtbareSpaltenBenutzer = state.matches
          ? [...this.mobileSpaltenBenutzer]
          : [...this.desktopSpaltenBenutzer];
      });
  }

  auswahlBearbeiten(element: IBenutzer): void {
    const id = element?.id;
    if (!id) {
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
          this.dataSource.data = this.benutzer;
          this.formModul.reset({ username: '', first_name: '', last_name: '', roles: [], password1: '', password2: '' });
          this.formModul.disable();
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
    this.username = "";
    this.formModul.reset({ username: '', first_name: '', last_name: '', roles: [], password1: '', password2: '' });
    this.formModul.disable();
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
            this.benutzer = this.globalDataService.arraySortByKey(this.benutzer, 'username');
            this.dataSource.data = this.benutzer;
            this.formModul.reset({ username: '', first_name: '', last_name: '', roles: [], password1: '', password2: '' });
            this.formModul.disable();
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
            this.benutzer = this.globalDataService.arraySortByKey(this.benutzer, 'username');
            this.dataSource.data = this.benutzer;
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

  applyFilter(value: string): void {
    this.dataSource.filter = (value || '').trim().toLowerCase();
    this.matPaginator?.firstPage();
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

  isAdminUser(user: IBenutzer): boolean {
    return this.normalizeRoleKeys(user?.roles).includes('ADMIN');
  }
}
