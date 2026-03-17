import { Component } from '@angular/core';

/**
 * `<imr-top-actions>`
 *
 * Aktionsleiste für den oberen Bereich einer Seite oder Karte.
 * Stellt einen flex-basierten Container für Buttons, Suchfelder und andere
 * Steuerelemente bereit.
 *
 * @example
 * ```html
 * <imr-top-actions>
 *   <mat-form-field>
 *     <mat-label>Filter</mat-label>
 *     <input matInput (input)="filter($event)" />
 *   </mat-form-field>
 *   <button mat-flat-button color="accent" (click)="add()">Hinzufügen</button>
 * </imr-top-actions>
 * ```
 */
@Component({
  selector: 'imr-top-actions',
  standalone: true,
  template: `
    <div class="imr-top-actions">
      <ng-content></ng-content>
    </div>
  `,
})
export class ImrTopActionsComponent {}
