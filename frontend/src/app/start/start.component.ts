import { Component, OnInit, inject } from '@angular/core';
import { ApiHttpService } from '../_service/api-http.service';
import { AuthSessionService } from '../_service/auth-session.service';
import { NavigationService } from '../_service/navigation.service';
import { UiMessageService } from '../_service/ui-message.service';
import { ImrHeaderComponent } from '../imr-ui-library';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-start',
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.sass'],
  standalone: true,
  imports: [
    ImrHeaderComponent,
    MatCardModule,
    RouterLink,
    MatIconModule,
    MatTooltipModule
  ]
})
export class StartComponent implements OnInit {

  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  private readonly adminRoleKey = 'ADMIN';

  breadcrumb: any[] = [];
  start_konfig: any[] = [];
  username = '';
  display_name = '';
  meine_rollen: string[] = [];

  categorizedItems: { name: string; items: any[] }[] = [];

  readonly defaultKonfig: any[] = [
    {
      icon: 'tune',
      modul: 'Modul Konfiguration',
      rolle: 'ADMIN',
      kategorie: 'Administration',
      routerlink: '/modul_konfiguration',
    },
    {
      icon: 'engineering',
      modul: 'Benutzerverwaltung',
      rolle: 'ADMIN',
      kategorie: 'Administration',
      routerlink: '/benutzer',
    },
    {
      icon: 'settings',
      modul: 'Konfiguration',
      rolle: 'ADMIN',
      kategorie: 'Administration',
      routerlink: '/konfiguration',
    },
  ];

  ngOnInit(): void {
    sessionStorage.setItem('PageNumber', '1');
    sessionStorage.setItem('Page1', 'Start');
    sessionStorage.setItem('Page2', '');

    this.breadcrumb = this.navigationService.ladeBreadcrumb();

    this.apiHttpService.get("modul_konfiguration").subscribe({
      next: (erg: any) => {
        try {
          const user = erg.user;
          this.meine_rollen = this.normalizeRoles(user?.roles);
          this.username = user?.username ?? '';
          this.display_name = user?.display_name || this.username;

          const main = Array.isArray(erg?.main) ? erg.main : [];
          const konfigs = main.find((m: any) => m.modul === 'start');

          this.start_konfig =
            (konfigs?.konfiguration?.length
              ? konfigs.konfiguration
              : this.defaultKonfig) ?? [];

          // 1️⃣ Zugriff strikt prüfen
          const allowed = this.start_konfig.filter(item =>
            this.userHasAccess(item) && !this.isHiddenItem(item)
          );

          this.categorizedItems = this.buildCategories(allowed);

        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: any) => {
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

  private userHasAccess(item: any): boolean {
    const itemRoles = this.normalizeRoles(item?.rolle);
    const userRoles = this.meine_rollen;

    return this.hasAccessByRoles(itemRoles, userRoles);
  }

  private hasAccessByRoles(itemRoles: string[], userRoles: string[]): boolean {
    if (itemRoles.length === 0) return true;
    return itemRoles.some(role => userRoles.includes(role));
  }

  private isHiddenItem(item: any): boolean {
    const modul = String(item?.modul ?? '').trim().toLowerCase();
    const routerlink = String(item?.routerlink ?? '').trim().toLowerCase();

    return modul === 'zahlen' || routerlink === '/zahlen' || routerlink.endsWith('/zahlen');
  }

  private isPureAdminItem(item: any): boolean {
    const roles = this.normalizeRoles(item?.rolle);
    return roles.length === 1 && roles[0] === this.adminRoleKey;
  }

  isAdminOnly(item: any): boolean {
    return this.isPureAdminItem(item);
  }

  isPlannedItem(item: any): boolean {
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

  private buildCategories(items: any[]): { name: string; items: any[] }[] {
    const map = new Map<string, any[]>();

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

  private normalizeCategory(item: any): string {
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
