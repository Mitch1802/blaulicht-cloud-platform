import {
  AfterContentInit,
  booleanAttribute,
  Component,
  ContentChild,
  EventEmitter,
  forwardRef,
  Input,
  Output,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import { MatSelectChange, MatSelectModule } from '@angular/material/select'
import { ImrSelectTriggerComponent } from './imr-select-trigger.component'

/**
 * imr-select
 *
 * Wrapper around mat-select to provide consistent select dropdown styling.
 * Usage:
 *   <imr-select formControlName="status">
 *     <imr-option value="active">Active</imr-option>
 *     <imr-option value="inactive">Inactive</imr-option>
 *   </imr-select>
 */
@Component({
  selector: 'imr-select',
  template: `
    <mat-select
      [value]="value"
      [multiple]="multiple"
      [disabled]="disabled"
      (selectionChange)="handleSelectionChange($event)"
      (closed)="handleTouched()"
    >
      @if (hasCustomTrigger) {
        <mat-select-trigger><ng-content select="imr-select-trigger"></ng-content></mat-select-trigger>
      }
      <ng-content></ng-content>
    </mat-select>
  `,
  standalone: true,
  imports: [CommonModule, MatSelectModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ImrSelectComponent),
      multi: true,
    },
  ],
})
export class ImrSelectComponent implements ControlValueAccessor, AfterContentInit {
  @ContentChild(ImrSelectTriggerComponent) selectTrigger?: ImrSelectTriggerComponent

  @Input() value: any = null
  @Input({ transform: booleanAttribute }) multiple = false
  @Input({ transform: booleanAttribute }) disabled = false
  @Output() selectionChange = new EventEmitter<MatSelectChange>()

  hasCustomTrigger = false

  private onChange: (value: any) => void = () => {}
  private onTouched: () => void = () => {}

  writeValue(value: any): void {
    this.value = value
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled
  }

  ngAfterContentInit(): void {
    this.hasCustomTrigger = !!this.selectTrigger
  }

  handleSelectionChange(event: MatSelectChange): void {
    this.value = event.value
    this.onChange(event.value)
    this.selectionChange.emit(event)
  }

  handleTouched(): void {
    this.onTouched()
  }
}
