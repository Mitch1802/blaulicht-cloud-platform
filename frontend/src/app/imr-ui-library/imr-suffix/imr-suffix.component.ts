import { Component, forwardRef } from '@angular/core'
import { MAT_SUFFIX } from '@angular/material/form-field'

/**
 * imr-suffix
 *
 * Suffix element for imr-form-field. Provides the MAT_SUFFIX token and the `matSuffix`
 * attribute so mat-form-field can detect and project it into the suffix slot correctly.
 * Usage: <imr-suffix>@example.com</imr-suffix>
 */
@Component({
  selector: 'imr-suffix',
  templateUrl: './imr-suffix.component.html',
  styleUrl: './imr-suffix.component.sass',
  standalone: true,
  imports: [],
  host: {
    'matSuffix': '',
  },
  providers: [
    { provide: MAT_SUFFIX, useExisting: forwardRef(() => ImrSuffixComponent) },
  ],
})
export class ImrSuffixComponent {
  /** Set to false to indicate this is an icon suffix (not a text suffix). Required by mat-form-field's _initializePrefixAndSuffix(). */
  readonly _isText = false
}

