import { Component } from '@angular/core';

/**
 * `<imr-section>`
 *
 * Standardisierter Seiten-/Abschnittscontainer der IMR UI Library.
 */
@Component({
  selector: 'imr-section',
  standalone: true,
  templateUrl: './imr-section.component.html',
  styleUrl: './imr-section.component.sass',
})
export class ImrSectionComponent {
  /** Optionaler Kartentitel (wird als <h2> im Kopfbereich gerendert) */
  @Input() title = '';
}
