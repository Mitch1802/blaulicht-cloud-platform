import {
  AfterViewInit,
  booleanAttribute,
  Component,
  forwardRef,
  inject,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR, NgControl } from '@angular/forms'
import { ErrorStateMatcher } from '@angular/material/core'
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field'
import { MatInput } from '@angular/material/input'
import { merge, Subject, takeUntil } from 'rxjs'

class HostControlErrorStateMatcher implements ErrorStateMatcher {
  constructor(private readonly resolveControl: () => NgControl['control'] | null | undefined) {}

  isErrorState(): boolean {
    const control = this.resolveControl()
    return !!control && control.invalid && (control.touched || control.dirty)
  }
}

@Component({
  selector: 'imr-input',
  templateUrl: './imr-input.component.html',
  styleUrl: './imr-input.component.sass',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ImrInputComponent),
      multi: true,
    },
  ],
  imports: [
    MatFormFieldModule,
    MatInput,
    MatLabel
  ],
})
export class ImrInputComponent implements ControlValueAccessor, OnInit, AfterViewInit, OnDestroy {
  @ViewChild(MatInput, { static: true }) private readonly _matInput!: MatInput

  private readonly _injector = inject(Injector)
  private readonly _destroyed$ = new Subject<void>()

  private _onChange: (value: string) => void = () => {}
  private _onTouched: () => void = () => {}
  private _value = ''
  private _disabled = false

  @Input() hintLabel = ''
  @Input() label = ''
  @Input() type = 'text'
  @Input() placeholder = ''
  @Input() autocomplete = 'off'
  @Input() fieldClass = 'imr-full-width'
  @Input() appearance: 'fill' | 'outline' = 'outline'
  @Input() subscriptSizing: 'fixed' | 'dynamic' = 'dynamic'

  @Input({ transform: booleanAttribute }) required = false
  @Input({ transform: booleanAttribute }) readonly = false

  @Input({ transform: booleanAttribute })
  get disabled(): boolean {
    return this._disabled
  }
  set disabled(value: boolean) {
    this._disabled = value
  }

  @Input()
  get value(): string {
    return this._value
  }
  set value(value: string | null | undefined) {
    this._value = value ?? ''
  }

  ngControl: NgControl | null = null
  readonly errorStateMatcher = new HostControlErrorStateMatcher(() => this.ngControl?.control)

  ngOnInit(): void {
    this.ngControl = this._injector.get(NgControl, null, { self: true, optional: true })
    if (this.ngControl) {
      this.ngControl.valueAccessor = this
    }
  }

  ngAfterViewInit(): void {
    const control = this.ngControl?.control
    if (!control) {
      return
    }

    merge(control.valueChanges, control.statusChanges)
      .pipe(takeUntil(this._destroyed$))
      .subscribe(() => this._matInput.updateErrorState())
  }

  writeValue(value: unknown): void {
    this.value = typeof value === 'string' ? value : `${value ?? ''}`
  }

  registerOnChange(fn: (value: string) => void): void {
    this._onChange = fn
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled
  }

  handleInput(event: Event): void {
    const nextValue = (event.target as HTMLInputElement).value
    this.value = nextValue
    this._onChange(nextValue)
    this._matInput.updateErrorState()
  }

  handleBlur(): void {
    this._onTouched()
    this._matInput.updateErrorState()
  }

  ngOnDestroy(): void {
    this._destroyed$.next()
    this._destroyed$.complete()
  }
}


