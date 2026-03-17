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
  template: `
    <section class="imr-page">
      <header class="imr-page__head">
        <h1>{{ title }}</h1>
        <ng-content select="[imrPageActions]"></ng-content>
      </header>
      <ng-content></ng-content>
    </section>
  `,
})
export class ImrPageLayoutComponent {
  /** Pflichtfeld: Seitenüberschrift (wird als <h1> gerendert) */
  @Input({ required: true }) title = '';
}
