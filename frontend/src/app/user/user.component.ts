import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';

import { FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IBenutzer } from 'src/app/_interface/benutzer';
import { IMitglied } from 'src/app/_interface/mitglied';
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
import {
  ImrBreadcrumbItem,
  ImrButtonComponent,
  ImrFormFieldComponent,
  ImrHeaderComponent,
  ImrPageLayoutComponent,
  ImrSectionCardComponent,
  ImrTopActionsComponent,
  UiControlErrorMap,
  UiControlErrorsDirective,
} from '../imr-ui-library';
import { MatInput } from '@angular/material/input';
import { MatCheckbox, MatCheckboxChange } from '@angular/material/checkbox';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Observable, forkJoin } from 'rxjs';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

type RoleDefinition = {
  id?: number;
  key: string;
  verbose_name: string;
};

type UserListResponse = {
  data: IBenutzer[];
};

type UserContextResponse = {
  data: {
    rollen: RoleDefinition[];
    mitglieder: IMitglied[];
  };
};

type UserDetailResponse = {
  data: {
    user: IBenutzer;
  };
};

type UserCreateResponse = {
  user?: IBenutzer;
  invite_sent?: boolean;
};

type UserUpdateResponse = {
  data: IBenutzer;
};

type UserFormValue = {
  id: string;
  username: string;
  email: string;
  mitglied_id: number | null;
  roles: string[];
  password1: string;
  password2: string;
};

type UserCreatePayload = UserFormValue & {
  send_invite: boolean;
};

type UserUpdatePayload = Omit<UserCreatePayload, 'password1' | 'password2' | 'send_invite'>;

@Component({
    selector: 'app-user',
    templateUrl: './user.component.html',
    styleUrls: ['./user.component.sass'],
    imports: [
    ImrButtonComponent,
    ImrHeaderComponent,
    ImrPageLayoutComponent,
    ImrSectionCardComponent,
    ImrFormFieldComponent,
    ImrTopActionsComponent,
    FormsModule,
    ReactiveFormsModule,
    MatInput,
    UiControlErrorsDirective,
    MatCheckbox,
    MatAutocompleteModule,
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
  private breakpointObserver = inject(BreakpointObserver);
  private destroyRef = inject(DestroyRef);
  private readonly adminRoleKey = 'ADMIN';
  private readonly mitgliedRoleKey = 'MITGLIED';
  private paginator?: MatPaginator;

  title = 'Benutzer Verwaltung';
  modul = 'users';
  username = '';
  sendInviteMode = true;

  dataSource = new MatTableDataSource<IBenutzer>([]);

  @ViewChild(MatPaginator) set matPaginator(p: MatPaginator | undefined) {
    this.paginator = p;
    if (p) {
      this.dataSource.paginator = p;
    }
  }

  @ViewChild(MatSort) set matSort(s: MatSort | undefined) {
    if (s) {
      this.dataSource.sort = s;
    }
  }

  benutzer: IBenutzer[] = [];
  mitglieder: IMitglied[] = [];
  breadcrumb: ImrBreadcrumbItem[] = [];
  rollen: RoleDefinition[] = [];
  rollenOhne: RoleDefinition[] = [];
  rollenUebersichtSpalten: string[] = ['benutzer'];
  rollenMatrix: Record<string, string[]> = {};
  rollenMatrixDirty: Set<string> = new Set();
  private readonly desktopSpaltenBenutzer = ['username', 'mitglied_name', 'rolle', 'actions'];
  private readonly mobileSpaltenBenutzer = ['username', 'rolle', 'actions'];
  sichtbareSpaltenBenutzer: string[] = [...this.desktopSpaltenBenutzer];

  readonly usernameErrorMap: UiControlErrorMap = {
    required: 'Benutzername ist erforderlich!',
  };

  readonly initialPasswordErrorMap: UiControlErrorMap = {
    required: 'Bitte ein Initialpasswort eingeben!',
    minlength: 'Das Passwort muss mindestens 8 Zeichen lang sein!',
  };

  readonly initialPasswordRepeatErrorMap: UiControlErrorMap = {
    required: 'Bitte das Initialpasswort wiederholen!',
    minlength: 'Das Passwort muss mindestens 8 Zeichen lang sein!',
  };

  private normalizeFilterValue(value: string): string {
    return String(value || '').trim().toLowerCase();
  }

  private getBenutzerFilterText(user: IBenutzer): string {
    const mitglied = this.findMitgliedById(user.mitglied_id);
    const mitgliedLabel = mitglied ? this.getMitgliedLabel(mitglied) : '';
    const roles = this.normalizeRoleKeys(user?.roles)
      .map((roleKey) => this.rollen.find((rolle) => rolle.key === roleKey)?.verbose_name || roleKey)
      .join(' ');

    return `${user.username} ${mitgliedLabel} ${roles}`.toLowerCase();
  }

  private createEmptyFormValue(): UserFormValue {
    return {
      id: '',
      username: '',
      email: '',
      mitglied_id: null,
      roles: [],
      password1: '',
      password2: '',
    };
  }

  private isRoleObject(value: unknown): value is { key?: string | number | null; id?: string | number | null } {
    return typeof value === 'object' && value !== null;
  }

  private extractRoleKey(entry: unknown): string {
    if (typeof entry === 'string') {
      return entry.trim();
    }

    if (this.isRoleObject(entry)) {
      return String(entry.key ?? entry.id ?? '').trim();
    }

    return '';
  }

  private normalizeRoleKeys(raw: unknown): string[] {
    let values: unknown[] = [];

    if (Array.isArray(raw)) {
      values = raw;
    } else if (typeof raw === 'string') {
      values = raw.split(',').map((v) => v.trim()).filter((v) => v !== '');
    } else if (raw && typeof raw === 'object') {
      values = [raw];
    }

    const extracted = values
      .map((entry) => this.extractRoleKey(entry))
      .filter((value) => value !== '');

    const allowed = new Set(
      this.rollen
        .map((rolle) => String(rolle.key || '').trim())
        .filter((key) => key !== '')
    );
    const filtered = extracted.filter((key) => allowed.size === 0 || allowed.has(key));

    return Array.from(new Set(filtered));
  }

  private normalizeRolesWithAdminRule(raw: unknown): string[] {
    const normalized = this.normalizeRoleKeys(raw);
    if (normalized.includes(this.adminRoleKey)) {
      return [this.adminRoleKey];
    }
    return normalized.filter((key) => key !== this.adminRoleKey);
  }

  private setRolesWithAdminRule(raw: unknown): void {
    this.formModul.controls['roles'].setValue(this.normalizeRolesWithAdminRule(raw));
  }

  private sortUsers(users: IBenutzer[]): IBenutzer[] {
    return this.collectionUtilsService.arraySortByKey([...users], 'username') as IBenutzer[];
  }

  private setUsers(users: IBenutzer[]): void {
    this.benutzer = this.sortUsers(users);
    this.dataSource.data = this.benutzer;
  }

  private findMitgliedById(mitgliedId: number | null | undefined): IMitglied | undefined {
    return this.mitglieder.find((mitglied) => mitglied.pkid === mitgliedId);
  }

  private updateCredentialValidators(): void {
    const emailValidators = this.isCreateMode() && this.sendInviteMode
      ? [Validators.required, Validators.email]
      : [Validators.email];

    const passwordValidators = this.isCreateMode() && !this.sendInviteMode
      ? [Validators.required, Validators.minLength(8)]
      : [Validators.minLength(8)];

    this.formModul.controls.email.setValidators(emailValidators);
    this.formModul.controls.password1.setValidators(passwordValidators);
    this.formModul.controls.password2.setValidators(passwordValidators);

    this.formModul.controls.email.updateValueAndValidity({ emitEvent: false });
    this.formModul.controls.password1.updateValueAndValidity({ emitEvent: false });
    this.formModul.controls.password2.updateValueAndValidity({ emitEvent: false });
  }

  private resetEditor(disabled = true): void {
    this.username = '';
    this.formModul.reset(this.createEmptyFormValue());
    this.mitgliedSuche.setValue('');
    this.sendInviteMode = true;

    if (disabled) {
      this.formModul.disable();
    } else {
      this.formModul.enable();
    }

    this.updateCredentialValidators();
  }

  private isCreateMode(): boolean {
    return !this.formModul.controls.id.value;
  }

  private validateCreateCredentials(password1: string, password2: string, sendInvite: boolean): boolean {
    if (sendInvite) {
      if (!String(this.formModul.controls.email.value || '').trim()) {
        this.uiMessageService.erstelleMessage('error', 'Für den Einladungsmodus ist eine E-Mail-Adresse erforderlich.');
        return false;
      }
      return true;
    }

    if (password1 === '' || password2 === '') {
      this.uiMessageService.erstelleMessage('error', 'Bitte ein Initialpasswort in beide Felder eintragen.');
      return false;
    }

    if (password1 !== password2) {
      this.uiMessageService.erstelleMessage('error', 'Die Passwörter müssen übereinstimmen!');
      return false;
    }

    return true;
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
    email: new FormControl('', Validators.email),
    mitglied_id: new FormControl<number | null>(null),
    roles: new FormControl<string[]>([]),
    password1: new FormControl('', Validators.minLength(8)),
    password2: new FormControl('',Validators.minLength(8))
  });

  mitgliedSuche = new FormControl<string>('', { nonNullable: true });

  get filteredMitgliedOptionen(): IMitglied[] {
    const search = this.mitgliedSuche.value.trim().toLowerCase();
    if (!search) {
      return this.mitglieder;
    }

    const selectedMitgliedId = this.formModul.controls['mitglied_id'].value;
    const selectedMitglied = this.mitglieder.find((m) => m.pkid === selectedMitgliedId);
    if (selectedMitglied && search === this.getMitgliedLabel(selectedMitglied).toLowerCase()) {
      return this.mitglieder;
    }

    return this.mitglieder.filter((m) =>
      this.getMitgliedLabel(m).toLowerCase().includes(search)
    );
  }

  onMitgliedSelected(event: MatAutocompleteSelectedEvent): void {
    const mitglied = event.option.value as IMitglied | null;
    if (!mitglied) {
      this.formModul.controls['mitglied_id'].setValue(null);
      this.mitgliedSuche.setValue('');
    } else {
      this.formModul.controls['mitglied_id'].setValue(mitglied.pkid);
      this.mitgliedSuche.setValue(this.getMitgliedLabel(mitglied));
    }
  }

  ngOnInit(): void {
    sessionStorage.setItem('PageNumber', '2');
    sessionStorage.setItem('Page2', 'V_B');
    this.breadcrumb = this.navigationService.ladeBreadcrumb();
    this.formModul.disable();
    this.updateCredentialValidators();
    this.dataSource.filterPredicate = (data: IBenutzer, filter: string) => {
      if (!filter) {
        return true;
      }
      return this.getBenutzerFilterText(data).includes(filter);
    };
    this.observeViewport();

    forkJoin({
      usersResponse: this.apiHttpService.get<UserListResponse>(this.modul),
      contextResponse: this.apiHttpService.get<UserContextResponse>(`${this.modul}/context`),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: ({ usersResponse, contextResponse }) => {
        this.rollen = Array.isArray(contextResponse.data?.rollen) ? contextResponse.data.rollen : [];
        this.mitglieder = Array.isArray(contextResponse.data?.mitglieder) ? contextResponse.data.mitglieder : [];
        this.rollenOhne = this.rollen.filter((rolle) => rolle.key !== this.mitgliedRoleKey);
        this.rollenUebersichtSpalten = ['benutzer', ...this.rollenOhne.map((rolle) => rolle.key)];
        this.setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : []);
        this.initRollenMatrix();
      },
      error: (error: unknown) => {
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
    const abfrageUrl = `${this.modul}/${id}`;

    this.apiHttpService.get<UserDetailResponse>(abfrageUrl).subscribe({
      next: (erg: UserDetailResponse) => {
        const details = erg.data.user;
        this.username = details.username;
        this.sendInviteMode = false;
        this.formModul.enable();

        const normalizedRoles = this.normalizeRolesWithAdminRule(details.roles);
        this.formModul.setValue({
          id: details.id,
          username: details.username,
          email: details.email || '',
          mitglied_id: details.mitglied_id ?? null,
          roles: normalizedRoles,
          password1: '',
          password2: '',
        });

        const selectedMitglied = this.findMitgliedById(details.mitglied_id);
        this.mitgliedSuche.setValue(selectedMitglied ? this.getMitgliedLabel(selectedMitglied) : '');
        this.setRolesWithAdminRule(this.formModul.controls.roles.value);
        this.updateCredentialValidators();
      },
      error: (error: unknown) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  neueDetails(): void {
    this.resetEditor(false);
  }

  setInviteMode(enabled: boolean): void {
    this.sendInviteMode = enabled;

    if (enabled) {
      this.formModul.controls.password1.setValue('');
      this.formModul.controls.password2.setValue('');
    }

    this.updateCredentialValidators();
  }

  datenLoeschen(): void {
    const id = this.formModul.controls["id"].value!;

    this.apiHttpService.delete(this.modul, id).subscribe({
      next: () => {
        this.setUsers(this.benutzer.filter((user) => user.id !== id));
        this.resetEditor();
        this.uiMessageService.erstelleMessage('success', 'Benutzer erfolgreich gelöscht!');
      },
      error: (error: unknown) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  abbrechen(): void {
    this.uiMessageService.erstelleMessage('info', 'Benutzer nicht gespeichert!');
    this.resetEditor();
  }

  datenSpeichern(): void {
    const rollen = this.normalizeRoleKeys(this.formModul.controls.roles.value);
    const password1 = this.formModul.controls["password1"].value || '';
    const password2 = this.formModul.controls["password2"].value || '';
    const sendInvite = this.isCreateMode() && this.sendInviteMode;

    if (!rollen.includes(this.adminRoleKey) && !rollen.includes(this.mitgliedRoleKey)) {
      rollen.push(this.mitgliedRoleKey);
    }

    this.formModul.controls.roles.setValue([...rollen]);

    const idValue = this.formModul.controls.id.value;
    const payloadCreate: UserCreatePayload = {
      id: this.formModul.controls.id.value || '',
      username: this.formModul.controls.username.value || '',
      email: this.formModul.controls.email.value || '',
      mitglied_id: this.formModul.controls.mitglied_id.value || null,
      roles: rollen,
      password1,
      password2,
      send_invite: sendInvite,
    };

    const payloadUpdate: UserUpdatePayload = {
      id: this.formModul.controls.id.value || '',
      username: this.formModul.controls.username.value || '',
      email: this.formModul.controls.email.value || '',
      mitglied_id: this.formModul.controls.mitglied_id.value || null,
      roles: rollen,
    };

    if (idValue === '' || idValue === null) {
      if (!this.validateCreateCredentials(password1, password2, sendInvite)) {
        return;
      }

      this.apiHttpService.post<UserCreateResponse>('users/create', payloadCreate, false).subscribe({
        next: (erg: UserCreateResponse) => {
          const createdUser = erg.user;

          if (createdUser) {
            this.setUsers([...this.benutzer, createdUser]);
          } else {
            this.dataSource.data = [...this.benutzer];
          }

          this.resetEditor();

          if (sendInvite && erg.invite_sent) {
            this.uiMessageService.erstelleMessage('success', 'Benutzer gespeichert und Einladungs-E-Mail versendet.');
          } else if (sendInvite) {
            this.uiMessageService.erstelleMessage('info', 'Benutzer gespeichert, aber die Einladungs-E-Mail konnte nicht versendet werden.');
          } else {
            this.uiMessageService.erstelleMessage('success', 'Benutzer erfolgreich gespeichert!');
          }
        },
        error: (error: unknown) => {
          this.authSessionService.errorAnzeigen(error);
        }
      });
    } else {
      this.apiHttpService.patch<UserUpdateResponse>(this.modul, idValue, payloadUpdate, false).subscribe({
        next: (erg: UserUpdateResponse) => {
          const updatedUsers = this.benutzer.map((user) =>
            user.id === erg.data.id ? erg.data : user
          );

          this.setUsers(updatedUsers);
          this.resetEditor();
          this.uiMessageService.erstelleMessage('success', 'Benutzer erfolgreich geändert!');
        },
        error: (error: unknown) => {
          this.authSessionService.errorAnzeigen(error);
        }
      });
    }
  }

  applyFilter(value: string): void {
    this.dataSource.filter = this.normalizeFilterValue(value);
    this.paginator?.firstPage();
  }

  passwortAendern(): void {
    const password1 = this.formModul.controls.password1.value || '';
    const password2 = this.formModul.controls.password2.value || '';

    if (password1 === '' || password2 === '') {
      this.uiMessageService.erstelleMessage('error', 'Bitte beide Passwortfelder ausfüllen.');
      return;
    }

    if (password1 !== password2) {
      this.uiMessageService.erstelleMessage('error', 'Die Passwörter müssen übereinstimmen!');
      return;
    }

    const dict = {
      password: password1,
    };
    const idValue = this.formModul.controls["id"].value!;
    this.apiHttpService.patch('users/change_password', idValue, dict, false).subscribe({
      next: () => {
        this.formModul.controls.password1.setValue('');
        this.formModul.controls.password2.setValue('');
        this.uiMessageService.erstelleMessage('success', 'User Passwort erfolgreich geändert!');
      },
      error: (error: unknown) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  rolleToggle(key: string, event: MatCheckboxChange): void {
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

  rollenMatrixToggle(userId: string, roleKey: string, event: MatCheckboxChange): void {
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
      if (!user) {
        return null;
      }

      const roles = [...(this.rollenMatrix[userId] || [])];
      if (!roles.includes(this.adminRoleKey) && !roles.includes(this.mitgliedRoleKey)) {
        roles.push(this.mitgliedRoleKey);
      }

      const payload: UserUpdatePayload = {
        id: userId,
        username: user.username,
        email: user.email || '',
        mitglied_id: user.mitglied_id ?? null,
        roles,
      };

      return this.apiHttpService.patch(this.modul, userId, payload, false);
    }).filter((request): request is Observable<UserUpdateResponse> => request !== null);

    forkJoin(requests).subscribe({
      next: (results: UserUpdateResponse[]) => {
        const updatedUsers = [...this.benutzer];

        results.forEach((erg) => {
          const idx = updatedUsers.findIndex((user) => user.id === erg.data.id);
          if (idx >= 0) {
            updatedUsers[idx] = erg.data;
          }
        });

        this.setUsers(updatedUsers);
        this.rollenMatrixDirty.clear();
        this.uiMessageService.erstelleMessage('success', 'Rollen erfolgreich gespeichert!');
      },
      error: (error: unknown) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  getMitgliedLabel(mitglied: IMitglied): string {
    return `${mitglied.stbnr} ${mitglied.vorname} ${mitglied.nachname}`;
  }
  getMitgliedNameByUser(element: IBenutzer): string {
    if (!element.mitglied_id) return '';
    const m = this.mitglieder.find((m) => m.pkid === element.mitglied_id);
    return m ? `${m.vorname} ${m.nachname}` : '';
  }
}
