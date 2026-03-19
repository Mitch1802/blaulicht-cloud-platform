import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatStepper } from '@angular/material/stepper';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import { ImrStepComponent } from '../imr-step.component';
import { ImrStepperComponent } from './imr-stepper.component';

@Component({
  standalone: true,
  imports: [ImrStepperComponent, ImrStepComponent],
  template: `
    <imr-stepper [selectedIndex]="1" orientation="vertical" [linear]="true">
      <imr-step label="Basisdaten">Schritt 1</imr-step>
      <imr-step label="Pruefung" [optional]="true">Schritt 2</imr-step>
      <imr-step label="Abschluss">Schritt 3</imr-step>
    </imr-stepper>
  `,
})
class HostComponent {}

describe('ImrStepperComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('uebergibt die Konfiguration an den Material-Stepper', () => {
    const stepper = fixture.debugElement.query(By.directive(MatStepper)).componentInstance as MatStepper;
    const wrapper = fixture.debugElement.query(By.directive(ImrStepperComponent)).componentInstance as ImrStepperComponent;

    expect(stepper.selectedIndex).toBe(1);
    expect(stepper.orientation).toBe('vertical');
    expect(wrapper.renderedSteps.length).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('Schritt 2');
  });
});
