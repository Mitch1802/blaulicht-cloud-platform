import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DateInputMaskDirective } from './date-input-mask.directive';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, DateInputMaskDirective],
  template: '<input [formControl]="ctrl" appDateInputMask="dmy" />',
})
class HostDmyComponent {
  ctrl = new FormControl<string>('', { nonNullable: true });
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, DateInputMaskDirective],
  template: '<input [formControl]="ctrl" appDateInputMask="iso" />',
})
class HostIsoComponent {
  ctrl = new FormControl<string>('', { nonNullable: true });
}

describe('DateInputMaskDirective', () => {
  let fixture: ComponentFixture<HostDmyComponent>;
  let host: HostDmyComponent;
  let input: HTMLInputElement;

  const triggerInput = (value: string): void => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostDmyComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostDmyComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
  });

  it('should create and configure text input with fixed date length', () => {
    expect(input).toBeTruthy();
    expect(input.type).toBe('text');
    expect(input.maxLength).toBe(10);
    expect(input.minLength).toBe(10);
  });

  it('should auto-format typed digits to TT.MM.YYYY', () => {
    triggerInput('12122024');

    expect(input.value).toBe('12.12.2024');
    expect(host.ctrl.value).toBe('12.12.2024');
  });

  it('should keep control value empty while date is incomplete', () => {
    triggerInput('121220');

    expect(input.value).toBe('12.12.20');
    expect(host.ctrl.value).toBe('');
  });

  it('should block key input when 8 digits are already present', () => {
    triggerInput('12122024');

    const event = new KeyboardEvent('keydown', {
      key: '5',
      bubbles: true,
      cancelable: true,
    });

    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBeTrue();
    expect(input.value).toBe('12.12.2024');
  });

  it('should clamp pasted values to exact date length', () => {
    const pasteEvent = new Event('paste', {
      bubbles: true,
      cancelable: true,
    }) as ClipboardEvent;

    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: {
        getData: () => '12.12.123456',
      },
    });

    input.dispatchEvent(pasteEvent);
    fixture.detectChanges();

    expect(input.value).toBe('12.12.1234');
    expect(host.ctrl.value).toBe('12.12.1234');
  });

  it('should clamp dropped values to exact date length', () => {
    const dropEvent = new Event('drop', {
      bubbles: true,
      cancelable: true,
    }) as DragEvent;

    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        getData: () => '1212123456',
      },
    });

    input.dispatchEvent(dropEvent);
    fixture.detectChanges();

    expect(input.value).toBe('12.12.1234');
    expect(host.ctrl.value).toBe('12.12.1234');
  });

  it('should expose ISO value for iso mode while showing TT.MM.YYYY', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [HostIsoComponent],
    }).compileComponents();

    const isoFixture = TestBed.createComponent(HostIsoComponent);
    const isoHost = isoFixture.componentInstance;
    isoFixture.detectChanges();

    const isoInput = isoFixture.nativeElement.querySelector('input') as HTMLInputElement;

    isoHost.ctrl.setValue('2026-03-09');
    isoFixture.detectChanges();

    expect(isoInput.value).toBe('09.03.2026');

    isoInput.value = '01022026';
    isoInput.dispatchEvent(new Event('input', { bubbles: true }));
    isoFixture.detectChanges();

    expect(isoInput.value).toBe('01.02.2026');
    expect(isoHost.ctrl.value).toBe('2026-02-01');
  });
});
