import { Component, OnInit, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  Validators,
  ValidatorFn,
  AbstractControl,
  ReactiveFormsModule,
} from '@angular/forms';
import { ApiHttpService } from '../_service/api-http.service';
import { AuthSessionService } from '../_service/auth-session.service';
import { NavigationService } from '../_service/navigation.service';
import { UiMessageService } from '../_service/ui-message.service';
import {
  ImrBreadcrumbItem,
  ImrCardComponent,
  ImrHeaderComponent,
  ImrPageLayoutComponent,
  ImrSectionComponent,
} from '../imr-ui-library';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import startRegelConfig from './konfig.json';

type StartKonfigItem = {
  icon?: string;
  modul?: string;
  rolle?: string | string[];
  kategorie?: string;
  category?: string;
  routerlink?: string;
};

type StartModulEintrag = {
  id?: number;
  modul?: string;
  konfiguration?: StartKonfigItem[];
};

type StartResponse = {
  user?: {
    roles?: string[] | string;
    username?: string;
    display_name?: string;
  };
  main?: StartModulEintrag[];
};

type ModulKonfigSaveResult = { id: number; modul: string; konfiguration: StartKonfigItem[] };

@Component({
  selector: 'app-start',
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.sass'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ImrHeaderComponent,
    ImrPageLayoutComponent,
    ImrSectionComponent,
    ImrCardComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    RouterLink,
  ]
})
export class StartComponent implements OnInit {

  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  private readonly adminRoleKey = 'ADMIN';
  private readonly modulEndpoint = 'modul_konfiguration';

  breadcrumb: ImrBreadcrumbItem[] = [];
  start_konfig: StartKonfigItem[] = [];
  username = '';
  display_name = '';
  meine_rollen: string[] = [];

  categorizedItems: { name: string; items: StartKonfigItem[] }[] = [];

  readonly defaultKonfig: StartKonfigItem[] = startRegelConfig;

  // --- Settings Panel ---
  settingsPanelOpen = false;
  startModulId: number | null = null;
  settingsForm = new FormGroup({
    konfiguration: new FormControl<string>('', [Validators.required, this.validJson()]),
  });

  get isAdmin(): boolean {
    return this.meine_rollen.includes(this.adminRoleKey);
  }

  ngOnInit(): void {
    sessionStorage.setItem('PageNumber', '1');
    sessionStorage.setItem('Page1', 'Start');
    sessionStorage.setItem('Page2', '');

    this.breadcrumb = this.navigationService.ladeBreadcrumb();

    this.apiHttpService.get<StartResponse>('modul_konfiguration').subscribe({
      next: (erg: StartResponse) => {
        try {
          const user = erg?.user;
          this.meine_rollen = this.normalizeRoles(user?.roles);
          this.username = user?.username ?? '';
          this.display_name = 'Hallo ' + (user?.display_name || this.username) + '!';

          const main = Array.isArray(erg?.main) ? erg.main : [];
          const startEntry = main.find((m: StartModulEintrag) => m.modul === 'start');
          this.startModulId = startEntry?.id ?? null;

          const configured = Array.isArray(startEntry?.konfiguration) ? startEntry.konfiguration : [];
          this.start_konfig = configured.length > 0 ? configured : this.defaultKonfig;

          this.rebuildCategorizedItems();

        } catch (e: unknown) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: unknown) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  openSettings(): void {
    this.settingsForm.patchValue({
      konfiguration: JSON.stringify(this.start_konfig, null, 2),
    });
    this.settingsPanelOpen = true;
  }

  closeSettings(): void {
    this.settingsPanelOpen = false;
  }

  settingsSpeichern(): void {
    if (this.settingsForm.invalid) {
      this.uiMessageService.erstelleMessage('error', 'Bitte gültiges JSON eingeben!');
      return;
    }

    const konfiguration = JSON.parse(this.settingsForm.controls['konfiguration'].value!);
    const objekt = { modul: 'start', konfiguration };

    if (!this.startModulId) {
      this.apiHttpService.post<ModulKonfigSaveResult>(this.modulEndpoint, objekt, false).subscribe({
        next: (saved) => {
          try {
            if (!Array.isArray(saved.konfiguration)) {
              this.uiMessageService.erstelleMessage('error', 'Ungültige Serverantwort – Konfiguration konnte nicht übernommen werden!');
              return;
            }
            this.startModulId = saved.id;
            this.start_konfig = saved.konfiguration;
            this.rebuildCategorizedItems();
            this.closeSettings();
            this.uiMessageService.erstelleMessage('success', 'Startseite Konfiguration gespeichert!');
          } catch (e: unknown) {
            this.uiMessageService.erstelleMessage('error', String(e));
          }
        },
        error: (error: unknown) => this.authSessionService.errorAnzeigen(error),
      });
    } else {
      this.apiHttpService.patch<ModulKonfigSaveResult>(this.modulEndpoint, this.startModulId, objekt, false).subscribe({
        next: (saved) => {
          try {
            if (!Array.isArray(saved.konfiguration)) {
              this.uiMessageService.erstelleMessage('error', 'Ungültige Serverantwort – Konfiguration konnte nicht übernommen werden!');
              return;
            }
            this.start_konfig = saved.konfiguration;
            this.rebuildCategorizedItems();
            this.closeSettings();
            this.uiMessageService.erstelleMessage('success', 'Startseite Konfiguration aktualisiert!');
          } catch (e: unknown) {
            this.uiMessageService.erstelleMessage('error', String(e));
          }
        },
        error: (error: unknown) => this.authSessionService.errorAnzeigen(error),
      });
    }
  }

  settingsLoeschen(): void {
    if (!this.startModulId) return;

    this.apiHttpService.delete(this.modulEndpoint, this.startModulId).subscribe({
      next: () => {
        try {
          this.startModulId = null;
          this.start_konfig = [...this.defaultKonfig];
          this.rebuildCategorizedItems();
          this.closeSettings();
          this.uiMessageService.erstelleMessage('success', 'Startseite Konfiguration gelöscht!');
        } catch (e: unknown) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: unknown) => this.authSessionService.errorAnzeigen(error),
    });
  }

  private rebuildCategorizedItems(): void {
    const allowed = this.start_konfig.filter((item) =>
      this.userHasAccess(item) && !this.isHiddenItem(item)
    );
    this.categorizedItems = this.buildCategories(allowed);
  }

  private validJson(): ValidatorFn {
    return (control: AbstractControl) => {
      const v = control.value;
      if (!v) return null;
      try {
        JSON.parse(v);
        return null;
      } catch {
        return { jsonInvalid: true };
      }
    };
  }

  /* ============================
     Rollen-Logik
     ============================ */

  private normalizeRoles(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .map(v => String(v).trim().toUpperCase())
        .filter(Boolean);
    }

    return String(value ?? '')
      .split(',')
      .map(r => r.trim().toUpperCase())
      .filter(Boolean);
  }

  private userHasAccess(item: StartKonfigItem): boolean {
    const itemRoles = this.normalizeRoles(item?.rolle);
    const userRoles = this.meine_rollen;

    return this.hasAccessByRoles(itemRoles, userRoles);
  }

  private hasAccessByRoles(itemRoles: string[], userRoles: string[]): boolean {
    if (itemRoles.length === 0) return true;
    return itemRoles.some(role => userRoles.includes(role));
  }

  private isHiddenItem(item: StartKonfigItem): boolean {
    const modul = String(item?.modul ?? '').trim().toLowerCase();
    const routerlink = String(item?.routerlink ?? '').trim().toLowerCase();

    return modul === 'zahlen' || routerlink === '/zahlen' || routerlink.endsWith('/zahlen');
  }

  private isPureAdminItem(item: StartKonfigItem): boolean {
    const roles = this.normalizeRoles(item?.rolle);
    return roles.length === 1 && roles[0] === this.adminRoleKey;
  }

  isAdminOnly(item: StartKonfigItem): boolean {
    return this.isPureAdminItem(item);
  }

  isPlannedItem(item: StartKonfigItem): boolean {
    const category = this.normalizeCategory(item).trim().toLowerCase();
    return category === 'geplant';
  }

  private readonly categoryOrder: string[] = [
    'Dokumentation',
    'Fachchargen',
    'Verwaltung',
    'Administration',
    'Geplant',
  ];

  private categoryRank(name: string): number {
    const idx = this.categoryOrder.findIndex(
      (c) => c.toLowerCase() === name.trim().toLowerCase()
    );
    if (idx < 0) {
      // Unknown categories are placed at the slot originally occupied by "Geplant"
      // (i.e. last known index = length - 1), so they appear before "Geplant" itself.
      return this.categoryOrder.length - 1;
    }
    // "Geplant" is the last entry in categoryOrder; shift it one rank beyond all
    // known and unknown categories so it always appears last.
    if (idx === this.categoryOrder.length - 1) {
      return this.categoryOrder.length;
    }
    return idx;
  }

  private buildCategories(items: StartKonfigItem[]): { name: string; items: StartKonfigItem[] }[] {
    const map = new Map<string, StartKonfigItem[]>();

    for (const item of items) {
      const category = this.normalizeCategory(item);
      const list = map.get(category) ?? [];
      list.push(item);
      map.set(category, list);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => this.categoryRank(a) - this.categoryRank(b))
      .map(([name, groupedItems]) => ({ name, items: groupedItems }));
  }

  private normalizeCategory(item: StartKonfigItem): string {
    const raw = String(item?.kategorie ?? item?.category ?? '').trim();
    return raw || 'Allgemein';
  }

  getCategoryAnchorId(name: string): string {
    const normalized = String(name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `category-${normalized || 'allgemein'}`;
  }
}

