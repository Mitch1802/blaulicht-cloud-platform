import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import { ImrExpansionPanelHeaderComponent } from '../imr-expansion-panel-header.component';
import { ImrPanelDescriptionComponent } from '../imr-panel-description.component';
import { ImrPanelTitleComponent } from '../imr-panel-title.component';
import { ImrExpansionPanelComponent } from './imr-expansion-panel.component';

@Component({
  standalone: true,
  imports: [ImrExpansionPanelComponent, ImrPanelTitleComponent, ImrPanelDescriptionComponent],
  template: `
    <imr-expansion-panel panelClass="detail-panel">
      <imr-panel-title>Geraetedetails</imr-panel-title>
      <imr-panel-description>einsatzbereit</imr-panel-description>
      <p class="panel-content">Details</p>
    </imr-expansion-panel>
  `,
})
class HostWithHeaderComponent {}

@Component({
  standalone: true,
  imports: [ImrExpansionPanelComponent, ImrExpansionPanelHeaderComponent],
  template: `
    <imr-expansion-panel panelClass="detail-panel">
      <imr-expansion-panel-header headerClass="custom-header" collapsedHeight="52px" expandedHeight="60px">
        <span class="custom-header-text">Eigener Header</span>
      </imr-expansion-panel-header>
      <p class="panel-content">Details</p>
    </imr-expansion-panel>
  `,
})
class HostWithCustomHeaderComponent {}

@Component({
  standalone: true,
  imports: [ImrExpansionPanelComponent],
  template: `
    <imr-expansion-panel>
      <p class="panel-content">Nur Inhalt</p>
    </imr-expansion-panel>
  `,
})
class HostWithoutHeaderComponent {}

describe('ImrExpansionPanelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostWithHeaderComponent, HostWithCustomHeaderComponent, HostWithoutHeaderComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
  });

  it('rendert den Header, wenn ein Titel-Slot vorhanden ist', () => {
    const fixture: ComponentFixture<HostWithHeaderComponent> = TestBed.createComponent(HostWithHeaderComponent);
    fixture.detectChanges();

    const panel = fixture.debugElement.query(By.css('mat-expansion-panel.detail-panel'));
    const header = fixture.debugElement.query(By.css('mat-expansion-panel-header'));

    expect(panel).toBeTruthy();
    expect(header).toBeTruthy();
    expect(header.nativeElement.textContent).toContain('Geraetedetails');
  });

  it('rendert den benutzerdefinierten Header-Slot in der Material-Struktur', () => {
    const fixture: ComponentFixture<HostWithCustomHeaderComponent> = TestBed.createComponent(HostWithCustomHeaderComponent);
    fixture.detectChanges();

    const header = fixture.debugElement.query(By.css('mat-expansion-panel-header.custom-header'));

    expect(header).toBeTruthy();
    expect(header.nativeElement.textContent).toContain('Eigener Header');
  });

  it('blendet den Header aus, wenn kein Titel-Slot vorhanden ist', () => {
    const fixture: ComponentFixture<HostWithoutHeaderComponent> = TestBed.createComponent(HostWithoutHeaderComponent);
    fixture.detectChanges();

    const header = fixture.debugElement.query(By.css('mat-expansion-panel-header'));

    expect(header).toBeNull();
  });
});
