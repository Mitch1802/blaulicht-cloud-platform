import { Component, OnInit, inject } from '@angular/core';
import { GlobalDataService } from '../_service/global-data.service';
import { HeaderComponent } from '../_template/header/header.component';
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
    HeaderComponent,
    MatCardModule,
    RouterLink,
    MatIconModule,
    MatTooltipModule
  ]
})
export class StartComponent implements OnInit {

  private globalDataService = inject(GlobalDataService);
  private readonly adminRoleKey = 'ADMIN';

  breadcrumb: any[] = [];
  start_konfig: any[] = [];
  username = '';
  first_name = '';
  last_name = '';
  meine_rollen: string[] = [];
  isAdminViewer = false;
  countsLoaded = false;
  private freigeschaltetCountByItemKey = new Map<string, number>();

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

    this.breadcrumb = this.globalDataService.ladeBreadcrumb();

    this.globalDataService.get("modul_konfiguration").subscribe({
      next: (erg: any) => {
        try {
          const user = erg.user;
          this.meine_rollen = this.normalizeRoles(user?.roles);
          this.first_name = user.first_name;
          this.last_name = user.last_name;
          this.username = user.username;

          const main = Array.isArray(erg?.main) ? erg.main : [];
          const konfigs = main.find((m: any) => m.modul === 'start');

          this.start_konfig =
            (konfigs?.konfiguration?.length
              ? konfigs.konfiguration
              : this.defaultKonfig) ?? [];

          this.isAdminViewer = this.meine_rollen.includes(this.adminRoleKey);

          // 1️⃣ Zugriff strikt prüfen
          const allowed = this.start_konfig.filter(item =>
            this.userHasAccess(item) && !this.isHiddenItem(item)
          );

          this.categorizedItems = this.buildCategories(allowed);

          if (this.isAdminViewer) {
            this.loadFreigeschaltetCounts(allowed);
          }

        } catch (e: any) {
          this.globalDataService.erstelleMessage("error", e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
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

  private normalizeUserRoles(user: any): string[] {
    const roles = this.normalizeRoles(user?.roles);
    if ((user?.is_superuser === true || user?.admin === true) && !roles.includes(this.adminRoleKey)) {
      roles.push(this.adminRoleKey);
    }
    return roles;
  }

  private itemKey(item: any): string {
    const modul = String(item?.modul ?? '').trim().toLowerCase();
    const routerLink = String(item?.routerlink ?? '').trim().toLowerCase();
    return `${routerLink}|${modul}`;
  }

  private loadFreigeschaltetCounts(items: any[]): void {
    this.countsLoaded = false;

    this.globalDataService.get('users').subscribe({
      next: (response: any) => {
        const rawUsers = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.data?.results)
              ? response.data.results
              : Array.isArray(response?.main)
                ? response.main
                : Array.isArray(response?.results)
                  ? response.results
            : [];

        const activeUsers = rawUsers.filter((user: any) => user?.is_active !== false);
        const counts = new Map<string, number>();

        for (const item of items) {
          const itemRoles = this.normalizeRoles(item?.rolle);
          const count = activeUsers.reduce((sum: number, user: any) => {
            const userRoles = this.normalizeUserRoles(user);
            return this.hasAccessByRoles(itemRoles, userRoles) ? sum + 1 : sum;
          }, 0);

          counts.set(this.itemKey(item), count);
        }

        this.freigeschaltetCountByItemKey = counts;
        this.countsLoaded = true;
      },
      error: () => {
        this.freigeschaltetCountByItemKey.clear();
        this.countsLoaded = true;
      },
    });
  }

  showFreigeschaltetBadge(item: any): boolean {
    return this.isAdminViewer && this.countsLoaded && this.freigeschaltetCountByItemKey.has(this.itemKey(item));
  }

  getFreigeschaltetCount(item: any): number {
    return this.freigeschaltetCountByItemKey.get(this.itemKey(item)) ?? 0;
  }

  private isHiddenItem(item: any): boolean {
    const modul = String(item?.modul ?? '').trim().toLowerCase();
    const routerlink = String(item?.routerlink ?? '').trim().toLowerCase();

    return modul === 'zahlen' || routerlink === '/zahlen' || routerlink.endsWith('/zahlen');
  }

  private isPureAdminItem(item: any): boolean {
    const roles = this.normalizeRoles(item?.rolle);
    return roles.length === 1 && roles[0] === 'ADMIN';
  }

  isAdminOnly(item: any): boolean {
    return this.isPureAdminItem(item);
  }

  isPlannedItem(item: any): boolean {
    const category = this.normalizeCategory(item).trim().toLowerCase();
    return category === 'geplant';
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
      .sort(([a], [b]) => {
        const aPlanned = a.trim().toLowerCase() === 'geplant';
        const bPlanned = b.trim().toLowerCase() === 'geplant';

        if (aPlanned && !bPlanned) return 1;
        if (!aPlanned && bPlanned) return -1;
        return 0;
      })
      .map(([name, groupedItems]) => ({
      name,
      items: groupedItems,
      }));
  }

  private normalizeCategory(item: any): string {
    const raw = String(item?.kategorie ?? item?.category ?? '').trim();
    return raw || 'Allgemein';
  }
}
