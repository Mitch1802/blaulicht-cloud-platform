import { Component, Input } from '@angular/core';
import { ImrSectionCardComponent } from '../imr-ui-library/imr-section-card.component';

/**
 * @deprecated Verwende `<imr-section-card>` aus der IMR UI Library.
 * Diese Komponente bleibt aus Backward-Compatibility-Gründen erhalten.
 */
@Component({
  selector: 'ui-section-card',
  standalone: true,
  imports: [ImrSectionCardComponent],
  template: `
    <imr-section-card [title]="title">
      <ng-content select="[uiCardActions]" imrCardActions></ng-content>
      <ng-content></ng-content>
    </imr-section-card>
  `,
})
export class UiSectionCardComponent {
  @Input() title = '';
}
