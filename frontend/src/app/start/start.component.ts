import { Component, OnInit, inject } from '@angular/core';
import { GlobalDataService } from '../_service/global-data.service';
import { HeaderComponent } from '../_template/header/header.component';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-start',
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.sass'],
  standalone: true,
  imports: [
    HeaderComponent,
    MatCardModule,
    RouterLink,
    MatIconModule
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

  visibleItems: any[] = [];
  adminItems: any[] = [];

  defaultKonfig: any[] = [
    {
      icon: "tune",
      modul: "Modul Konfiguration",
      rolle: "ADMIN",
      routerlink: "/modul_konfiguration"
    },
    {
      icon: "engineering",
      modul: "Benutzerverwaltung",
      rolle: "ADMIN",
      routerlink: "/benutzer"
    },
    {
      icon: "settings",
      modul: "Konfiguration",
      rolle: "ADMIN",
      routerlink: "/konfiguration"
    }
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

          // 1️⃣ Zugriff strikt prüfen
          const allowed = this.start_konfig.filter(item =>
            this.userHasAccess(item)
          );

          // 2️⃣ Reine ADMIN-Module separieren
          this.adminItems = allowed.filter(item =>
            this.isPureAdminItem(item)
          );

          // 3️⃣ Restliche Module
          this.visibleItems = allowed.filter(item =>
            !this.isPureAdminItem(item)
          );

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

  private isPureAdminItem(item: any): boolean {
    const roles = this.normalizeRoles(item?.rolle);
    return roles.length === 1 && roles[0] === 'ADMIN';
  }
}
