import { Directive, ElementRef, HostListener, Input, OnInit, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

type DateMaskMode = 'iso' | 'dmy';

@Directive({
  selector: 'input[appDateInputMask]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateInputMaskDirective),
      multi: true,
    },
  ],
})
export class DateInputMaskDirective implements ControlValueAccessor, OnInit {
  @Input('appDateInputMask') mode: DateMaskMode = 'dmy';

  private readonly maxDigits = 8;
  private readonly maxDisplayLength = 10;
  private readonly navigationKeys = new Set([
    'Backspace',
    'Delete',
    'ArrowLeft',
    'ArrowRight',
    'Home',
    'End',
    'Tab',
    'Enter',
    'Escape',
  ]);

  private readonly host = inject(ElementRef<HTMLInputElement>);
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private isFocused = false;

  ngOnInit(): void {
    const input = this.host.nativeElement;
    input.type = 'text';
    input.inputMode = 'numeric';
    input.maxLength = this.maxDisplayLength;
    input.minLength = this.maxDisplayLength;
    if (!input.placeholder) {
      input.placeholder = 'TT.MM.YYYY';
    }
  }

  writeValue(value: string | null | undefined): void {
    const display = this.toDisplayValue(value);

    // Preserve partially typed input if the form model temporarily emits an empty value.
    if (this.isFocused && display === '' && this.host.nativeElement.value !== '') {
      return;
    }

    if (this.host.nativeElement.value !== display) {
      this.host.nativeElement.value = display;
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.host.nativeElement.disabled = isDisabled;
  }

  @HostListener('focus')
  onFocus(): void {
    this.isFocused = true;
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    if (this.navigationKeys.has(event.key)) {
      return;
    }

    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
      return;
    }

    const input = this.host.nativeElement;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;

    const currentDigits = input.value.replace(/\D/g, '');
    const selectedDigits = input.value.slice(start, end).replace(/\D/g, '').length;
    const nextDigitsLength = currentDigits.length - selectedDigits + 1;

    if (nextDigitsLength > this.maxDigits) {
      event.preventDefault();
    }
  }

  @HostListener('beforeinput', ['$event'])
  onBeforeInput(event: InputEvent): void {
    if (event.inputType.startsWith('delete')) {
      return;
    }

    const insertedText = String(event.data ?? '');
    if (insertedText === '') {
      return;
    }

    const insertedDigits = insertedText.replace(/\D/g, '');
    if (insertedDigits.length === 0) {
      event.preventDefault();
      return;
    }

    const input = this.host.nativeElement;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const currentDigits = input.value.replace(/\D/g, '');
    const selectedDigits = input.value.slice(start, end).replace(/\D/g, '').length;
    const nextDigitsLength = currentDigits.length - selectedDigits + insertedDigits.length;

    if (nextDigitsLength > this.maxDigits) {
      event.preventDefault();
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();

    const pastedText = event.clipboardData?.getData('text') ?? '';
    const input = this.host.nativeElement;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const nextRaw = `${input.value.slice(0, start)}${pastedText}${input.value.slice(end)}`;
    const formatted = this.formatToDmy(nextRaw);

    input.value = formatted;
    this.emitValue(formatted);
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    event.preventDefault();

    const droppedText = event.dataTransfer?.getData('text') ?? '';
    const input = this.host.nativeElement;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const nextRaw = `${input.value.slice(0, start)}${droppedText}${input.value.slice(end)}`;
    const formatted = this.formatToDmy(nextRaw);

    input.value = formatted;
    this.emitValue(formatted);
  }

  @HostListener('blur')
  onBlur(): void {
    this.isFocused = false;
    this.onTouched();
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const raw = target?.value ?? this.host.nativeElement.value;
    const formatted = this.formatToDmy(raw);
    if (this.host.nativeElement.value !== formatted) {
      this.host.nativeElement.value = formatted;
    }

    this.emitValue(formatted);
  }

  private emitValue(formatted: string): void {
    if (formatted === '') {
      this.onChange('');
      return;
    }

    if (formatted.length === 10 && this.isValidDmy(formatted)) {
      this.onChange(this.mode === 'iso' ? this.toIso(formatted) : formatted);
      return;
    }

    this.onChange('');
  }

  private toDisplayValue(value: string | null | undefined): string {
    const input = String(value ?? '').trim();
    if (input === '') {
      return '';
    }

    if (this.isDmy(input)) {
      return input;
    }

    if (this.isIso(input)) {
      const [year, month, day] = input.split('-');
      return `${day}.${month}.${year}`;
    }

    if (input.includes('T')) {
      const isoPrefix = input.split('T')[0];
      if (this.isIso(isoPrefix)) {
        const [year, month, day] = isoPrefix.split('-');
        return `${day}.${month}.${year}`;
      }
    }

    return this.formatToDmy(input);
  }

  private formatToDmy(raw: string): string {
    const digits = String(raw ?? '')
      .replace(/\D/g, '')
      .slice(0, this.maxDigits);

    if (digits.length <= 2) {
      return digits;
    }

    if (digits.length <= 4) {
      return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    }

    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
  }

  private toIso(dmy: string): string {
    const [day, month, year] = dmy.split('.');
    return `${year}-${month}-${day}`;
  }

  private isIso(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  private isDmy(value: string): boolean {
    return /^\d{2}\.\d{2}\.\d{4}$/.test(value);
  }

  private isValidDmy(value: string): boolean {
    if (!this.isDmy(value)) {
      return false;
    }

    const [dayRaw, monthRaw, yearRaw] = value.split('.');
    const day = Number(dayRaw);
    const month = Number(monthRaw);
    const year = Number(yearRaw);

    if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
      return false;
    }

    const parsed = new Date(year, month - 1, day);
    return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
  }
}

