import { Component } from '@angular/core'
import { MatFormFieldModule } from '@angular/material/form-field'

/**
 * imr-error
 *
 * Wrapper around mat-error.
 * Usage: <imr-error>Error message here</imr-error>
 */
@Component({
  selector: 'imr-error',
  template: `<mat-error><ng-content></ng-content></mat-error>`,
  standalone: true,
  imports: [MatFormFieldModule],
})
export class ImrErrorComponent {}
