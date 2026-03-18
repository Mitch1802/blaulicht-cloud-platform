import { Component } from '@angular/core'
import { MatFormFieldModule } from '@angular/material/form-field'

/**
 * imr-label
 *
 * Wrapper around mat-label.
 * Usage: <imr-label>Field Label</imr-label>
 */
@Component({
  selector: 'imr-label',
  template: `<mat-label><ng-content></ng-content></mat-label>`,
  standalone: true,
  imports: [MatFormFieldModule],
})
export class ImrLabelComponent {}
