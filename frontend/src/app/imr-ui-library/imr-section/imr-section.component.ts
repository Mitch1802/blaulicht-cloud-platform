import { Component } from '@angular/core';

/**
 * `<imr-section>`
 *
 * Standardisierter Seiten-/Abschnittscontainer der IMR UI Library.
 * Entspricht den Utility-Klassen `.imr-section` und `.imr-section__head`.
 */
@Component({
  selector: 'imr-section',
  standalone: true,
  templateUrl: './imr-section.component.html',
  styleUrl: './imr-section.component.sass',
  host: {
    class: 'imr-section',
  },
})
export class ImrSectionComponent {}
