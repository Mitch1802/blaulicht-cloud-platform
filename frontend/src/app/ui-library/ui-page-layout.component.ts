import { Component, Input } from '@angular/core';
import { ImrPageLayoutComponent } from '../imr-ui-library/imr-page-layout.component';

/**
 * @deprecated Verwende `<imr-page-layout>` aus der IMR UI Library.
 * Diese Komponente bleibt aus Backward-Compatibility-Gründen erhalten.
 */
@Component({
  selector: 'ui-page-layout',
  standalone: true,
  imports: [ImrPageLayoutComponent],
  template: `
    <imr-page-layout [title]="title">
      <ng-content select="[uiPageActions]" imrPageActions></ng-content>
      <ng-content></ng-content>
    </imr-page-layout>
  `,
})
export class UiPageLayoutComponent {
  @Input({ required: true }) title = '';
}
