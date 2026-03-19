import { Component } from '@angular/core';

/**
 * `<imr-chips>`
 *
 * Flexibler Container für `mat-chip` Elemente.
 * Stellt einheitliches Spacing und Styling für Chip-Gruppen bereit.
 *
 * @example
 * ```html
 * <imr-chips>
 *   <mat-chip-set>
 *     @for (role of roles; track role) {
 *       <mat-chip [removable]="true" (removed)="removeRole(role)">
 *         {{ role }}
 *         <mat-icon matChipRemove>cancel</mat-icon>
 *       </mat-chip>
 *     }
 *   </mat-chip-set>
 * </imr-chips>
 * ```
 */
@Component({
  selector: 'imr-chips',
  standalone: true,
  templateUrl: './imr-chips.component.html',
  styleUrl: './imr-chips.component.sass',
})
export class ImrChipsComponent {}


