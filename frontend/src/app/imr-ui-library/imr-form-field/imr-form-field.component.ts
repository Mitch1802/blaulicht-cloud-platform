import { Component, ContentChild, Input, OnInit, ViewChild } from '@angular/core'
import { MatFormField, MatFormFieldControl, MatFormFieldModule } from '@angular/material/form-field'
import { ImrLabelComponent } from '../imr-label/imr-label.component'
import { ImrErrorComponent } from '../imr-error/imr-error.component'
import { ImrSuffixComponent } from '../imr-suffix/imr-suffix.component'
/**
 * imr-form-field
 *
 * Wrapper around mat-form-field to provide consistent form field styling.
 * Usage:
 *   <imr-form-field>
 *     <imr-label>Email</imr-label>
 *     <input matInput ...>
 *     <imr-error>Error message</imr-error>
 *   </imr-form-field>
 */
@Component({
  selector: 'imr-form-field',
  templateUrl: './imr-form-field.component.html',
  styleUrl: './imr-form-field.component.sass',
  standalone: true,
  imports: [MatFormFieldModule],
})
export class ImrFormFieldComponent implements OnInit {
  @Input() fieldClass = 'imr-full-width'
  @Input() appearance: 'fill' | 'outline' = 'outline'
  @Input() hintLabel = ''
  @Input() subscriptSizing: 'fixed' | 'dynamic' = 'dynamic'

  @ViewChild(MatFormField, { static: true }) private readonly _matFormField!: MatFormField
  @ContentChild(MatFormFieldControl, { static: true, descendants: true })
  private readonly _fieldControl?: MatFormFieldControl<unknown>

  /** True when the consumer has provided an imr-label child element. */
  @ContentChild(ImrLabelComponent, { static: true })
  protected readonly _labelChild?: ImrLabelComponent

  /**
   * Reference to the projected imr-suffix child element, if provided.
   * Used to conditionally render the <span matSuffix> wrapper so that
   * mat-form-field can detect the suffix via @ContentChildren(MAT_SUFFIX).
   * static: false because the suffix may be conditionally rendered.
   */
  @ContentChild(ImrSuffixComponent, { static: false })
  protected readonly _suffixChild?: ImrSuffixComponent

  /**
   * Reference to the projected imr-error child element, if provided.
   * Used to conditionally render the <mat-error> wrapper so that
   * mat-form-field can detect it via @ContentChildren(MatError) and
   * display it in the subscript area below the field.
   * static: false because errors are typically conditionally rendered.
   */
  @ContentChild(ImrErrorComponent, { static: false })
  protected readonly _errorChild?: ImrErrorComponent

  get hasLabel(): boolean {
    return !!this._labelChild
  }

  ngOnInit(): void {
    if (this._fieldControl) {
      // Set _control explicitly so mat-form-field finds it before ngAfterContentInit runs.
      // This is necessary because Angular's @ContentChildren cannot traverse ng-content
      // boundaries, so mat-form-field cannot find the control in projected content.
      (this._matFormField as unknown as { _control: MatFormFieldControl<unknown> })._control =
        this._fieldControl

      // MatInput sets _isInFormField = true only when it successfully injects MAT_FORM_FIELD
      // via DI. Projected content lives in the declaring component's injector scope and
      // cannot reach mat-form-field's providers, so _isInFormField stays false. Without it,
      // MatInput's host bindings skip adding `mdc-text-field__input` and
      // `mat-mdc-form-field-input-control` — the classes that apply `width: 100%` and
      // remove the native browser border. Patch the flag here (before the first CD cycle
      // evaluates the host bindings) so the correct classes are applied.
      const ctrl = this._fieldControl as unknown as { _isInFormField?: boolean }
      if (typeof ctrl._isInFormField === 'boolean' && !ctrl._isInFormField) {
        ctrl._isInFormField = true
      }
    }
  }
}


