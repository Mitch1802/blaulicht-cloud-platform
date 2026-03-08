import { Component, OnInit, inject } from '@angular/core';
import { GlobalDataService } from '../_service/global-data.service';
import { HeaderComponent } from '../_template/header/header.component';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import startKonfig from './konfig.json';

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

  breadcrumb: any[] = [];
  start_konfig: any[] = [];
  username = '';
  first_name = '';
  last_name = '';
  meine_rollen: string[] = [];

  categorizedItems: { name: string; items: any[] }[] = [];

  defaultKonfig: any[] = startKonfig as any[];

  readonly requiredStartItems: any[] = [
    {
      icon: 'build',
      modul: 'Wartung/Service',
      rolle: 'ADMIN, INVENTAR, FAHRZEUG, ATEMSCHUTZ, PROTOKOLL',
      routerlink: '/wartung-service',
      kategorie: 'Verwaltung',
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

          this.start_konfig = this.ensureRequiredStartItems(this.start_konfig);

          // 1️⃣ Zugriff strikt prüfen
          const allowed = this.start_konfig.filter(item =>
            this.userHasAccess(item) && !this.isHiddenItem(item)
          );

          this.categorizedItems = this.buildCategories(allowed);

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

  private ensureRequiredStartItems(items: any[]): any[] {
    const result = Array.isArray(items) ? [...items] : [];

    for (const required of this.requiredStartItems) {
      const requiredLink = String(required?.routerlink ?? '').trim().toLowerCase();
      if (!requiredLink) {
        continue;
      }

      const exists = result.some((item) =>
        String(item?.routerlink ?? '').trim().toLowerCase() === requiredLink,
      );

      if (!exists) {
        result.push({ ...required });
      }
    }

    return result;
  }
}
