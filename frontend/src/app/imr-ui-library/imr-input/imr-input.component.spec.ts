import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import { ImrInputComponent } from './imr-input.component';

@Component({
  standalone: true,
  imports: [ImrInputComponent, ReactiveFormsModule, MatFormFieldModule],
  template: `
    <form [formGroup]="form">
      <imr-input label="E-Mail" type="email" formControlName="email">
        @if (form.controls.email.hasError('required') && form.controls.email.touched) {
          <mat-error>E-Mail ist erforderlich!</mat-error>
        }
      </imr-input>
    </form>
  `,
})
class HostWithReactiveFormComponent {
  readonly form = new FormGroup({
    email: new FormControl('max@example.com', [Validators.required, Validators.email]),
  });
}

describe('ImrInputComponent', () => {
  let fixture: ComponentFixture<HostWithReactiveFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostWithReactiveFormComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostWithReactiveFormComponent);
    fixture.detectChanges();
  });

  it('uebernimmt den initialen Wert aus dem FormControl', () => {
    const input = fixture.debugElement.query(By.css('imr-input input'));

    expect(input).toBeTruthy();
    expect((input.nativeElement as HTMLInputElement).value).toBe('max@example.com');
  });

  it('schreibt Eingaben in das FormControl zurueck', () => {
    const input = fixture.debugElement.query(By.css('imr-input input')).nativeElement as HTMLInputElement;

    input.value = 'neu@example.com';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.email.value).toBe('neu@example.com');
  });

  it('markiert das FormControl bei blur als touched', () => {
    const control = fixture.componentInstance.form.controls.email;
    const input = fixture.debugElement.query(By.css('imr-input input')).nativeElement as HTMLInputElement;

    control.markAsUntouched();
    fixture.detectChanges();

    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(control.touched).toBeTrue();
  });

  it('zeigt projiziertes mat-error bei touched + invalid an', () => {
    const control = fixture.componentInstance.form.controls.email;

    control.setValue('');
    control.markAsTouched();
    control.updateValueAndValidity();
    fixture.detectChanges();

    const error = fixture.debugElement.query(By.css('mat-error'));
    const errorWrapper = fixture.debugElement.query(By.css('.mat-mdc-form-field-error-wrapper'));

    expect(error).toBeTruthy();
    expect(error.nativeElement.textContent).toContain('E-Mail ist erforderlich!');
    expect(errorWrapper).toBeTruthy();
    if (errorWrapper) {
      expect(errorWrapper.nativeElement.contains(error.nativeElement)).toBeTrue();
    }
  });
});
