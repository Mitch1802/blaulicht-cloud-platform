import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

/**
 * `<imr-section-card>`
 *
 * Einheitliche Card-Struktur für Modul-Bereiche.
 * Kapselt eine `mat-card` mit standardisiertem Kopfbereich, optionalen
 * Card-Aktionen und einem Content-Bereich.
 *
 * @example
 * ```html
 * <imr-section-card title="Mitglieder verwalten">
 *   <div imrCardActions>
 *     <button mat-flat-button color="accent">Hinzufügen</button>
 *   </div>
 *   <!-- Karteninhalt -->
 * </imr-section-card>
 * ```
 */
@Component({
  selector: 'imr-section-card',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <mat-card class="imr-card">
      @if (title) {
        <div class="imr-card__head">
          <h2>{{ title }}</h2>
          <ng-content select="[imrCardActions]"></ng-content>
        </div>
      }
      <mat-card-content class="imr-card__content">
        <ng-content></ng-content>
      </mat-card-content>
    </mat-card>
  `,
})
export class ImrSectionCardComponent {
  /** Optionaler Kartentitel (wird als <h2> im Kopfbereich gerendert) */
  @Input() title = '';
}
