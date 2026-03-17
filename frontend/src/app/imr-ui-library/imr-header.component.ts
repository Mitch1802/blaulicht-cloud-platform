import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthSessionService } from '../_service/auth-session.service';
import { environment } from 'src/environments/environment';

/**
 * Breadcrumb-Eintrag für `<imr-header>`.
 * Unterstützt sowohl `kuerzel`/`link` (NavigationService) als auch
 * `label`/`url` (alternative Konvention mancher Komponenten).
 */
export interface ImrBreadcrumbItem {
  /** Anzeigetext des Breadcrumb-Eintrags (primär) */
  kuerzel?: string;
  /** Anzeigetext des Breadcrumb-Eintrags (alternativ) */
  label?: string;
  /** Navigations-URL (primär) */
  link?: string | null;
  /** Navigations-URL (alternativ) */
  url?: string | null;
  /** Laufende Nummer (optional, von NavigationService gesetzt) */
  number?: number;
}

/**
 * `<imr-header>`
 *
 * Haupt-Header der Anwendung basierend auf Material Design 3 Toolbar.
 * Zeigt Logo, App-Titel, Logout-Button und optionale Breadcrumb-Navigation.
 *
 * @example
 * ```html
 * <imr-header [breadcrumb]="breadcrumb"></imr-header>
 * ```
 */
@Component({
  selector: 'imr-header',
  standalone: true,
  imports: [MatToolbar, RouterLink, MatIconButton, MatIconModule],
  template: `
    <mat-toolbar class="imr-header-toolbar">
      <a class="imr-header-logo-link" routerLink="/start" aria-label="Zur Startseite">
        <img class="imr-header-logo" src="../assets/images/icon.svg" alt="Blaulicht Cloud Logo" />
      </a>
      <a class="title imr-header-title imr-header-title-link" routerLink="/start" aria-label="Zur Startseite">
        {{ appTitle }}
      </a>
      <span class="spacer"></span>
      <button class="imr-header-logout" mat-icon-button type="button" aria-label="Abmelden" (click)="authService.abmelden()">
        <mat-icon>logout</mat-icon>
      </button>
    </mat-toolbar>

    <div class="imr-header-stepper-wrap">
      <nav class="imr-breadcrumb" aria-label="Breadcrumb">
        @if (hasBreadcrumb) {
          <a class="breadcrumb-item breadcrumb-home breadcrumb-link" aria-label="Startseite" routerLink="/start">
            <mat-icon>home</mat-icon>
          </a>

          @for (link of breadcrumb; track link; let i = $index) {
            @if (i > 0) {
              <span class="breadcrumb-separator" aria-hidden="true">&gt;</span>
              @if (link.link || link.url) {
                <a class="breadcrumb-item breadcrumb-link" [routerLink]="link.link || link.url">{{ link.kuerzel || link.label }}</a>
              } @else {
                <span class="breadcrumb-item">{{ link.kuerzel || link.label }}</span>
              }
            }
          }
        }
      </nav>
    </div>
  `,
})
export class ImrHeaderComponent {
  protected authService = inject(AuthSessionService);
  protected appTitle: string = environment.title;

  /** Breadcrumb-Einträge für die Navigationsleiste */
  @Input() breadcrumb: ImrBreadcrumbItem[] = [];

  get hasBreadcrumb(): boolean {
    return Array.isArray(this.breadcrumb) && this.breadcrumb.length > 0;
  }
}
