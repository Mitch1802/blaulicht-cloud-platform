import { Component, Input } from '@angular/core';

/**
 * `<imr-page-layout>`
 *
 * Standardisierter Seiten-Container der IMR UI Library.
 * Stellt den Seitenrahmen mit Überschrift bereit.
 *
 * @example
 * ```html
 * <imr-page-layout title="Meine Seite">
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
  /** Optionale Seitenüberschrift (wird als <h1> gerendert) */
  @Input() title = '';

  /** Zusätzliche CSS-Klassen für den äußeren Seiten-Container */
  @Input() pageClass = '';
}



