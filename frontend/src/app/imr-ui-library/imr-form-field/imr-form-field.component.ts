import { Component, ContentChild, Input, OnInit, ViewChild } from '@angular/core'
import { MatFormField, MatFormFieldControl, MatFormFieldModule } from '@angular/material/form-field'

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

  ngOnInit(): void {
    if (this._fieldControl) {
      // Set _control explicitly so mat-form-field finds it before ngAfterContentInit runs.
      // This is necessary because Angular's @ContentChildren cannot traverse ng-content
      // boundaries, so mat-form-field cannot find the control in projected content.
      (this._matFormField as unknown as { _control: MatFormFieldControl<unknown> })._control =
        this._fieldControl
    }
  }
}


