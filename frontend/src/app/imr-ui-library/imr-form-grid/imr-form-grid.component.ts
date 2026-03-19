import { Component } from '@angular/core';

/**
 * `<imr-form-grid>`
 *
 * 12-Spalten-Grid-Container für Formularfelder.
 * Kombiniert das App-Grid mit formular-spezifischen Abständen.
 *
 * @example
 * ```html
 * <imr-form-grid>
 *   <div class="app-col-12 app-col-lg-6">
 *     <mat-form-field class="imr-full-width">
 *       <mat-label>Vorname</mat-label>
 *       <input matInput formControlName="vorname" />
 *     </mat-form-field>
 *   </div>
 *   <div class="app-col-12 app-col-lg-6">
 *     <mat-form-field class="imr-full-width">
 *       <mat-label>Nachname</mat-label>
 *       <input matInput formControlName="nachname" />
 *     </mat-form-field>
 *   </div>
 * </imr-form-grid>
 * ```
 */
@Component({
  selector: 'imr-form-grid',
  standalone: true,
  templateUrl: './imr-form-grid.component.html',
  styleUrl: './imr-form-grid.component.sass',
})
export class ImrFormGridComponent {}


