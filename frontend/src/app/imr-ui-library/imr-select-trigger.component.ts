import { Component } from '@angular/core'

/**
 * imr-select-trigger
 *
 * Slot component for customizing the trigger display of imr-select.
 * Usage: <imr-select><imr-select-trigger>Custom value</imr-select-trigger>...</imr-select>
 */
@Component({
  selector: 'imr-select-trigger',
  template: `<ng-content></ng-content>`,
  standalone: true,
})
export class ImrSelectTriggerComponent {}
