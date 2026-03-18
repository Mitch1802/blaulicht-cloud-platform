import { Component } from '@angular/core'

/**
 * imr-panel-description
 *
 * Slot component for imr-expansion-panel header description.
 * Usage: <imr-expansion-panel><imr-panel-description>Desc</imr-panel-description>...</imr-expansion-panel>
 */
@Component({
  selector: 'imr-panel-description',
  template: `<ng-content></ng-content>`,
  standalone: true,
})
export class ImrPanelDescriptionComponent {}
