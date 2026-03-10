import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';

import { FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IBenutzer } from 'src/app/_interface/benutzer';
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
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
import { MatTabsModule } from '@angular/material/tabs';

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
    MatIconModule,
    MatTabsModule
]
})
export class UserComponent implements OnInit {
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  breakpointObserver = inject(BreakpointObserver);
  destroyRef = inject(DestroyRef);
  private readonly adminRoleKey = 'ADMIN';
  private readonly mitgliedRoleKey = 'MITGLIED';

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
  rollenOhne: any[] = [];
  rollenUebersichtSpalten: string[] = ['benutzer'];
  rollenMatrix: { [userId: string]: string[] } = {};
  rollenMatrixDirty: Set<string> = new Set();
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

  private normalizeRolesWithAdminRule(raw: any): string[] {
    const normalized = this.normalizeRoleKeys(raw);
    if (normalized.includes(this.adminRoleKey)) {
      return [this.adminRoleKey];
    }
    return normalized.filter((key) => key !== this.adminRoleKey);
  }

  private setRolesWithAdminRule(raw: any): void {
    this.formModul.controls['roles'].setValue(this.normalizeRolesWithAdminRule(raw));
  }

  isAdminRoleSelected(): boolean {
    return this.normalizeRoleKeys(this.formModul.controls['roles'].value).includes(this.adminRoleKey);
  }

  isRoleDisabled(roleKey: string): boolean {
    const key = String(roleKey ?? '').trim();
    if (!key) {
      return false;
    }
    return key !== this.adminRoleKey && this.isAdminRoleSelected();
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
    this.breadcrumb = this.navigationService.ladeBreadcrumb();
    this.formModul.disable();
    this.observeViewport();

    forkJoin({
      usersResponse: this.apiHttpService.get<any>(this.modul),
      contextResponse: this.apiHttpService.get<any>(`${this.modul}/context`),
    }).subscribe({
      next: ({ usersResponse, contextResponse }) => {
        try {
          this.benutzer = usersResponse.data;
          this.rollen = contextResponse.data.rollen;
          this.rollenOhne = this.rollen.filter((r: any) => r.key !== this.mitgliedRoleKey);
          this.rollenUebersichtSpalten = ['benutzer', ...this.rollenOhne.map((r: any) => r.key)];
          this.benutzer = this.collectionUtilsService.arraySortByKey(this.benutzer, 'username');
          this.dataSource.data = this.benutzer;
          this.initRollenMatrix();
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
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

    this.apiHttpService.get(abfrageUrl).subscribe({
      next: (erg: any) => {
        try {
          const details: IBenutzer = erg.data.user;
          this.username = details.username;
          this.formModul.enable();
          const normalizedRoles = this.normalizeRolesWithAdminRule(details.roles);
          this.formModul.setValue({
            id: details.id,
            username: details.username,
            first_name: details.first_name,
            last_name: details.last_name,
            roles: normalizedRoles,
            password1: "",
            password2: ""
          });
          this.setRolesWithAdminRule(this.formModul.controls['roles'].value);
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', String(e));
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

  datenLoeschen(): void {
    const id = this.formModul.controls["id"].value!;

    this.apiHttpService.delete(this.modul, id).subscribe({
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
          this.uiMessageService.erstelleMessage('success', 'Benutzer erfolgreich gelöscht!');
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  abbrechen(): void {
    this.uiMessageService.erstelleMessage('info', 'Benutzer nicht gespeichert!');
    this.username = "";
    this.formModul.reset({ username: '', first_name: '', last_name: '', roles: [], password1: '', password2: '' });
    this.formModul.disable();
  }

  datenSpeichern(): void {
    const rollen = this.normalizeRoleKeys(this.formModul.controls["roles"].value);

    if (!rollen.includes(this.adminRoleKey) && !rollen.includes(this.mitgliedRoleKey)) {
      rollen.push(this.mitgliedRoleKey);
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
        this.uiMessageService.erstelleMessage('error', 'Passwort 1 & 2 müssen ausgefüllt sein!');
        return
      }else if (this.formModul.controls["password1"].value !== "" && this.formModul.controls["password2"].value !== "" && this.formModul.controls["password1"].value !== this.formModul.controls["password2"].value) {
        this.uiMessageService.erstelleMessage('error', 'Die Passwörter müssen übereinstimmen!');
        return
      }
      this.apiHttpService.post("users/create", payloadCreate, false).subscribe({
        next: (erg: any) => {
          try {
            this.username = "";
            this.benutzer.push(erg.user);
            this.benutzer = this.collectionUtilsService.arraySortByKey(this.benutzer, 'username');
            this.dataSource.data = this.benutzer;
            this.formModul.reset({ username: '', first_name: '', last_name: '', roles: [], password1: '', password2: '' });
            this.formModul.disable();
            this.uiMessageService.erstelleMessage('success', 'Benutzer erfolgreich gespeichert!');
          } catch (e: any) {
            this.uiMessageService.erstelleMessage('error', String(e));
          }
        },
        error: (error: any) => {
          this.authSessionService.errorAnzeigen(error);
        }
      });
    } else {
      this.apiHttpService.patch(this.modul, idValue, payloadUpdate, false).subscribe({
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
            this.benutzer = this.collectionUtilsService.arraySortByKey(this.benutzer, 'username');
            this.dataSource.data = this.benutzer;
            this.formModul.reset({ username: '', first_name: '', last_name: '', roles: [], password1: '', password2: '' });
            this.formModul.disable();
            this.uiMessageService.erstelleMessage('success', 'Benutzer erfolgreich geändert!');
          } catch (e: any) {
            this.uiMessageService.erstelleMessage('error', String(e));
          }
        },
        error: (error: any) => {
          this.authSessionService.errorAnzeigen(error);
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
      this.uiMessageService.erstelleMessage('error', 'Die Passwörter müssen übereinstimmen!');
      return
    }
    const dict = {
      "password": this.formModul.controls["password1"].value
    }
    const idValue = this.formModul.controls["id"].value!;
    this.apiHttpService.patch("users/change_password", idValue, dict, false).subscribe({
      next: (erg: any) => {
        try {
          this.formModul.controls["password1"].setValue("");
          this.formModul.controls["password2"].setValue("");
          this.uiMessageService.erstelleMessage('success', 'User Passwort erfolgreich geändert!');
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  rolleToggle(key: string, event: any): void {
    const roleKey = String(key ?? '').trim();
    const current = this.normalizeRoleKeys(this.formModul.controls['roles'].value);

    if (roleKey === this.adminRoleKey) {
      this.formModul.controls['roles'].setValue(event.checked ? [this.adminRoleKey] : []);
      return;
    }

    if (this.isAdminRoleSelected()) {
      return;
    }

    if (event.checked && !current.includes(roleKey)) {
      this.formModul.controls['roles'].setValue([...current, roleKey]);
    } else if (!event.checked) {
      this.formModul.controls['roles'].setValue(current.filter((r) => r !== roleKey));
    }
  }

  isAdminUser(user: IBenutzer): boolean {
    return this.normalizeRoleKeys(user?.roles).includes('ADMIN');
  }

  initRollenMatrix(): void {
    this.rollenMatrix = {};
    this.rollenMatrixDirty.clear();
    for (const user of this.benutzer) {
      this.rollenMatrix[user.id] = this.normalizeRolesWithAdminRule(user.roles);
    }
  }

  hasRoleInMatrix(userId: string, roleKey: string): boolean {
    return (this.rollenMatrix[userId] || []).includes(roleKey);
  }

  isAdminInMatrix(userId: string): boolean {
    return (this.rollenMatrix[userId] || []).includes(this.adminRoleKey);
  }

  isRoleDisabledInMatrix(userId: string, roleKey: string): boolean {
    const key = String(roleKey ?? '').trim();
    return key !== this.adminRoleKey && this.isAdminInMatrix(userId);
  }

  rollenMatrixToggle(userId: string, roleKey: string, event: any): void {
    const current = [...(this.rollenMatrix[userId] || [])];
    if (roleKey === this.adminRoleKey) {
      this.rollenMatrix[userId] = event.checked ? [this.adminRoleKey] : [];
    } else {
      if (this.isAdminInMatrix(userId)) return;
      if (event.checked && !current.includes(roleKey)) {
        this.rollenMatrix[userId] = [...current, roleKey];
      } else if (!event.checked) {
        this.rollenMatrix[userId] = current.filter((r) => r !== roleKey);
      }
    }
    this.rollenMatrixDirty.add(userId);
  }

  rollenMatrixSpeichern(): void {
    const dirtyIds = Array.from(this.rollenMatrixDirty);
    if (dirtyIds.length === 0) {
      this.uiMessageService.erstelleMessage('info', 'Keine Änderungen vorhanden!');
      return;
    }

    const requests = dirtyIds.map((userId) => {
      const user = this.benutzer.find((u) => u.id === userId);
      if (!user) return null;
      const roles = [...(this.rollenMatrix[userId] || [])];
      if (!roles.includes(this.adminRoleKey) && !roles.includes(this.mitgliedRoleKey)) {
        roles.push(this.mitgliedRoleKey);
      }
      const payload = {
        id: userId,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        roles,
      };
      return this.apiHttpService.patch(this.modul, userId, payload, false);
    }).filter(Boolean);

    forkJoin(requests as any[]).subscribe({
      next: (results: any[]) => {
        try {
          results.forEach((erg: any) => {
            const idx = this.benutzer.findIndex((u) => u.id === erg.data.id);
            if (idx >= 0) {
              this.benutzer[idx] = erg.data;
            }
          });
          this.dataSource.data = [...this.benutzer];
          this.rollenMatrixDirty.clear();
          this.uiMessageService.erstelleMessage('success', 'Rollen erfolgreich gespeichert!');
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }
}
