import { Component, OnInit, inject } from '@angular/core';
import { ApiHttpService } from '../_service/api-http.service';
import { AuthSessionService } from '../_service/auth-session.service';
import { NavigationService } from '../_service/navigation.service';
import { UiMessageService } from '../_service/ui-message.service';
import { ImrCardComponent } from '../imr-ui-library/imr-card.component';
import { ImrBreadcrumbItem, ImrHeaderComponent } from '../imr-ui-library/imr-header.component';
import { ImrIconComponent } from '../imr-ui-library/imr-icon.component';
import { ImrPageLayoutComponent } from '../imr-ui-library/imr-page-layout.component';
import { ImrSectionCardComponent } from '../imr-ui-library/imr-section-card.component';
import { RouterLink } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
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

@Component({
  selector: 'app-start',
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.sass'],
  standalone: true,
  imports: [
    ImrHeaderComponent,
    ImrPageLayoutComponent,
    ImrSectionCardComponent,
    ImrCardComponent,
    ImrIconComponent,
    RouterLink,
    MatTooltipModule
  ]
})
export class StartComponent implements OnInit {

  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  private readonly adminRoleKey = 'ADMIN';

  breadcrumb: ImrBreadcrumbItem[] = [];
  start_konfig: StartKonfigItem[] = [];
  username = '';
  display_name = '';
  meine_rollen: string[] = [];

  categorizedItems: { name: string; items: StartKonfigItem[] }[] = [];

  readonly defaultKonfig: StartKonfigItem[] = startRegelConfig;

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
          this.display_name = user?.display_name || this.username;

          const main = Array.isArray(erg?.main) ? erg.main : [];
          const konfigs = main.find((m: StartModulEintrag) => m.modul === 'start');

          const configured = Array.isArray(konfigs?.konfiguration) ? konfigs.konfiguration : [];
          this.start_konfig = configured.length > 0 ? configured : this.defaultKonfig;

          const allowed = this.start_konfig.filter((item) =>
            this.userHasAccess(item) && !this.isHiddenItem(item)
          );

          this.categorizedItems = this.buildCategories(allowed);

        } catch (e: unknown) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: unknown) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
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
