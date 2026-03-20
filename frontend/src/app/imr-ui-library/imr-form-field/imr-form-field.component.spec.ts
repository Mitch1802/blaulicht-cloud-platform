import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ImrFormFieldComponent } from './imr-form-field.component';
import { ImrLabelComponent } from '../imr-label/imr-label.component';
import { ImrErrorComponent } from '../imr-error/imr-error.component';
import { ImrSuffixComponent } from '../imr-suffix/imr-suffix.component';

@Component({
  standalone: true,
  imports: [ImrFormFieldComponent, ImrLabelComponent, ImrErrorComponent, MatInputModule, ReactiveFormsModule],
  template: `
    <imr-form-field hintLabel="* Pflichtfeld">
      <imr-label>E-Mail</imr-label>
      <input matInput type="email" [formControl]="control" />
      @if (control.hasError('required') && control.touched) {
        <imr-error>E-Mail ist erforderlich!</imr-error>
      }
    </imr-form-field>
  `,
})
class HostWithLabelAndError {
  control = new FormControl('', Validators.required);
}

@Component({
  standalone: true,
  imports: [ImrFormFieldComponent, MatInputModule],
  template: `
    <imr-form-field>
      <input matInput placeholder="Suchen..." />
    </imr-form-field>
  `,
})
class HostWithoutLabel {}

@Component({
  standalone: true,
  imports: [ImrFormFieldComponent, ImrLabelComponent, ImrSuffixComponent, MatInputModule],
  template: `
    <imr-form-field>
      <imr-label>Benutzername</imr-label>
      <input matInput type="text" />
      <imr-suffix>@example.com</imr-suffix>
    </imr-form-field>
  `,
})
class HostWithSuffix {}

describe('ImrFormFieldComponent', () => {
  describe('mit Label', () => {
    let fixture: ComponentFixture<HostWithLabelAndError>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [HostWithLabelAndError],
        providers: [provideNoopAnimations()],
      }).compileComponents();

      fixture = TestBed.createComponent(HostWithLabelAndError);
      fixture.detectChanges();
    });

    it('rendert ein mat-form-field', () => {
      const formField = fixture.debugElement.query(By.css('mat-form-field'));
      expect(formField).toBeTruthy();
    });

    it('rendert mat-label im korrekten Bereich (nicht im Infix)', () => {
      // mat-label must be present as direct content of mat-form-field, not inside infix
      const matLabel = fixture.debugElement.query(By.css('mat-label'));
      expect(matLabel).toBeTruthy();
      expect(matLabel.nativeElement.textContent.trim()).toBe('E-Mail');
    });

    it('verwendet mdc-text-field--no-label NICHT (Label ist vorhanden)', () => {
      const textField = fixture.debugElement.query(By.css('.mdc-text-field'));
      expect(textField).toBeTruthy();
      expect(textField.nativeElement.classList.contains('mdc-text-field--no-label')).toBeFalse();
    });

    it('zeigt Fehler unterhalb des Feldes (nicht im Infix)', () => {
      fixture.componentInstance.control.markAsTouched();
      fixture.detectChanges();

      const errorWrapper = fixture.debugElement.query(By.css('.mat-mdc-form-field-error-wrapper'));
      const imrError = fixture.debugElement.query(By.css('imr-error'));

      expect(imrError).toBeTruthy();
      // imr-error must be inside the error wrapper, not the infix
      if (errorWrapper && imrError) {
        expect(errorWrapper.nativeElement.contains(imrError.nativeElement)).toBeTrue();
      }
    });
  });

  describe('ohne Label', () => {
    let fixture: ComponentFixture<HostWithoutLabel>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [HostWithoutLabel],
        providers: [provideNoopAnimations()],
      }).compileComponents();

      fixture = TestBed.createComponent(HostWithoutLabel);
      fixture.detectChanges();
    });

    it('rendert mat-form-field korrekt ohne Label', () => {
      const formField = fixture.debugElement.query(By.css('mat-form-field'));
      expect(formField).toBeTruthy();
    });

    it('verwendet mdc-text-field--no-label wenn kein Label vorhanden', () => {
      const textField = fixture.debugElement.query(By.css('.mdc-text-field'));
      expect(textField).toBeTruthy();
      expect(textField.nativeElement.classList.contains('mdc-text-field--no-label')).toBeTrue();
    });
  });

  describe('mit Suffix', () => {
    let fixture: ComponentFixture<HostWithSuffix>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [HostWithSuffix],
        providers: [provideNoopAnimations()],
      }).compileComponents();

      fixture = TestBed.createComponent(HostWithSuffix);
      fixture.detectChanges();
    });

    it('rendert den Suffix im Icon-Suffix-Bereich', () => {
      const iconSuffix = fixture.debugElement.query(By.css('.mat-mdc-form-field-icon-suffix'));
      const imrSuffix = fixture.debugElement.query(By.css('imr-suffix'));

      expect(imrSuffix).toBeTruthy();
      if (iconSuffix && imrSuffix) {
        expect(iconSuffix.nativeElement.contains(imrSuffix.nativeElement)).toBeTrue();
      }
    });
  });
});
