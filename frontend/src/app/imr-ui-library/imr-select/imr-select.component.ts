import {
  AfterContentInit,
  AfterViewInit,
  booleanAttribute,
  Component,
  ContentChild,
  EventEmitter,
  forwardRef,
  inject,
  Input,
  Injector,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { ControlValueAccessor, NG_VALUE_ACCESSOR, NgControl } from '@angular/forms'
import { MatFormFieldControl } from '@angular/material/form-field'
import { MatSelect, MatSelectChange, MatSelectModule } from '@angular/material/select'
import { Subject, takeUntil } from 'rxjs'
import { ImrSelectTriggerComponent } from '../imr-select-trigger/imr-select-trigger.component'

let nextUniqueId = 0

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
  templateUrl: './imr-select.component.html',
  styleUrl: './imr-select.component.sass',
  standalone: true,
  imports: [CommonModule, MatSelectModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ImrSelectComponent),
      multi: true,
    },
    {
      provide: MatFormFieldControl,
      useExisting: forwardRef(() => ImrSelectComponent),
    },
  ],
})
export class ImrSelectComponent
  implements
    ControlValueAccessor,
    MatFormFieldControl<unknown>,
    OnInit,
    AfterContentInit,
    AfterViewInit,
    OnDestroy
{
  @ViewChild(MatSelect, { static: true }) private readonly matSelect!: MatSelect
  @ContentChild(ImrSelectTriggerComponent) selectTrigger?: ImrSelectTriggerComponent

  readonly stateChanges = new Subject<void>()
  readonly controlType = 'imr-select'
  readonly id = `imr-select-${nextUniqueId++}`

  @Input() placeholder = ''
  @Input({ transform: booleanAttribute }) required = false
  @Input({ transform: booleanAttribute }) disabled = false
  @Input({ transform: booleanAttribute }) multiple = false

  @Input()
  get value(): unknown {
    return this._value
  }
  set value(value: unknown) {
    this._value = value
    this.stateChanges.next()
  }

  @Output() selectionChange = new EventEmitter<MatSelectChange>()

  hasCustomTrigger = false
  userAriaDescribedBy = ''

  private _value: unknown = null
  private readonly destroyed$ = new Subject<void>()
  private readonly injector = inject(Injector)

  private onChange: (value: unknown) => void = () => {}
  private onTouched: () => void = () => {}
  ngControl: NgControl | null = null

  ngOnInit(): void {
    this.ngControl = this.injector.get(NgControl, null, { self: true, optional: true })
    if (this.ngControl) {
      this.ngControl.valueAccessor = this
    }
  }

  get focused(): boolean {
    return this.matSelect.focused
  }

  get empty(): boolean {
    if (Array.isArray(this.value)) {
      return this.value.length === 0
    }

    return this.value === null || this.value === undefined || this.value === ''
  }

  get shouldLabelFloat(): boolean {
    return this.focused || !this.empty
  }

  get errorState(): boolean {
    const control = this.ngControl?.control
    if (!control) {
      return false
    }

    return control.invalid && (control.touched || control.dirty)
  }

  writeValue(value: unknown): void {
    this._value = value
    this.stateChanges.next()
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled
    this.stateChanges.next()
  }

  ngAfterContentInit(): void {
    this.hasCustomTrigger = !!this.selectTrigger
    this.stateChanges.next()
  }

  ngAfterViewInit(): void {
    this.matSelect.stateChanges
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => this.stateChanges.next())
  }

  handleSelectionChange(event: MatSelectChange): void {
    this.value = event.value
    this.onChange(event.value)
    this.selectionChange.emit(event)
    this.stateChanges.next()
  }

  handleTouched(): void {
    this.onTouched()
    this.stateChanges.next()
  }

  setDescribedByIds(ids: string[]): void {
    this.userAriaDescribedBy = ids.join(' ')
    this.stateChanges.next()
  }

  onContainerClick(): void {
    if (this.disabled) {
      return
    }

    this.matSelect.focus()
    this.matSelect.open()
  }

  ngOnDestroy(): void {
    this.destroyed$.next()
    this.destroyed$.complete()
    this.stateChanges.complete()
  }
}


