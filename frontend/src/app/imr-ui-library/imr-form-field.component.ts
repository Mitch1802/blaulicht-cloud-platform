import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatFormFieldModule } from '@angular/material/form-field'
import { ImrLabelComponent } from './imr-label.component'
import { ImrErrorComponent } from './imr-error.component'

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
  template: `
    <mat-form-field
      [class]="fieldClass"
      [appearance]="appearance"
      [hintLabel]="hintLabel"
      [subscriptSizing]="subscriptSizing"
    >
      <ng-content></ng-content>
    </mat-form-field>
  `,
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, ImrLabelComponent, ImrErrorComponent],
})
export class ImrFormFieldComponent {
  @Input() fieldClass = 'imr-full-width'
  @Input() appearance: 'fill' | 'outline' = 'fill'
  @Input() hintLabel = ''
  @Input() subscriptSizing: 'fixed' | 'dynamic' = 'fixed'
}
