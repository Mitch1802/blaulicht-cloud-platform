import { Component, Input } from '@angular/core';

/**
 * `<imr-page-layout>`
 *
 * Standardisierter Seiten-Container der IMR UI Library.
 * Stellt den Seitenrahmen mit Überschrift und optionalem Header-Action-Slot bereit.
 *
 * @example
 * ```html
 * <imr-page-layout title="Meine Seite">
 *   <div imrPageActions>
 *     <button mat-flat-button color="primary">Neu</button>
 *   </div>
 *   <!-- Seiteninhalt -->
 * </imr-page-layout>
 * ```
 */
@Component({
  selector: 'imr-page-layout',
  standalone: true,
  templateUrl: './imr-page-layout.component.html',
  styleUrl: './imr-page-layout.component.sass',
})
export class ImrPageLayoutComponent {
  /** Pflichtfeld: Seitenüberschrift (wird als <h1> gerendert) */
  @Input({ required: true }) title = '';
}


