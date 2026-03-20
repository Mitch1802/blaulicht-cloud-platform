import { Component, forwardRef } from '@angular/core'
import { MAT_ERROR } from '@angular/material/form-field'

/**
 * imr-error
 *
 * Error message for imr-form-field. Provides the MAT_ERROR token and the `matError`
 * attribute so mat-form-field can detect and project it correctly.
 * Usage: <imr-error>Error message here</imr-error>
 */
@Component({
  selector: 'imr-error',
  templateUrl: './imr-error.component.html',
  styleUrl: './imr-error.component.sass',
  standalone: true,
  imports: [],
  host: {
    'class': 'mat-mdc-form-field-error mat-mdc-form-field-bottom-align',
    'aria-live': 'polite',
    'matError': '',
  },
  providers: [
    { provide: MAT_ERROR, useExisting: forwardRef(() => ImrErrorComponent) },
  ],
})
export class ImrErrorComponent {}


