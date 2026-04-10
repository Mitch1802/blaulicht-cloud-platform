import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthSessionService } from '../../_service/auth-session.service';
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
  imports: [MatToolbarModule, RouterLink, MatIconButton, MatIconModule],
  templateUrl: './imr-header.component.html',
  styleUrl: './imr-header.component.sass',
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



