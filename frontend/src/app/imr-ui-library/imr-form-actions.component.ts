import { Component } from '@angular/core';

/**
 * `<imr-form-actions>`
 *
 * Aktionsleiste für Formularbereiche.
 * Stellt einen flex-basierten Container für Speichern/Abbrechen-Buttons bereit.
 *
 * @example
 * ```html
 * <imr-form-actions>
 *   <button mat-flat-button color="accent" type="submit">Speichern</button>
 *   <button mat-flat-button color="primary" type="button" (click)="cancel()">Abbrechen</button>
 * </imr-form-actions>
 * ```
 */
@Component({
  selector: 'imr-form-actions',
  standalone: true,
  template: `
    <div class="imr-form-actions">
      <ng-content></ng-content>
    </div>
  `,
})
export class ImrFormActionsComponent {}
