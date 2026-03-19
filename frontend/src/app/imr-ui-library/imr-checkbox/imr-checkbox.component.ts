import { booleanAttribute, Component, EventEmitter, forwardRef, Input, Output } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox'

/**
 * imr-checkbox
 *
 * Wrapper around mat-checkbox.
 * Usage: <imr-checkbox formControlName="agreed">I agree</imr-checkbox>
 */
@Component({
  selector: 'imr-checkbox',
  templateUrl: './imr-checkbox.component.html',
  styleUrl: './imr-checkbox.component.sass',
  standalone: true,
  imports: [CommonModule, MatCheckboxModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ImrCheckboxComponent),
      multi: true,
    },
  ],
})
export class ImrCheckboxComponent implements ControlValueAccessor {
  @Input() checked = false
  @Input({ transform: booleanAttribute }) disabled = false
  @Output() checkboxChange = new EventEmitter<MatCheckboxChange>()

  private onChange: (value: boolean) => void = () => {}
  private onTouched: () => void = () => {}

  writeValue(value: boolean | null): void {
    this.checked = Boolean(value)
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled
  }

  handleChange(event: MatCheckboxChange): void {
    this.checked = event.checked
    this.onChange(event.checked)
    this.checkboxChange.emit(event)
  }

  handleTouched(): void {
    this.onTouched()
  }
}


