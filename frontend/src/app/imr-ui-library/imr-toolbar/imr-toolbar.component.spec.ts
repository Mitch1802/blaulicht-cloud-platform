import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ImrToolbarComponent } from './imr-toolbar.component';

@Component({
  standalone: true,
  imports: [ImrToolbarComponent],
  template: `
    <imr-toolbar toolbarClass="imr-header-toolbar">
      <span class="toolbar-title">Portal</span>
    </imr-toolbar>
  `,
})
class HostComponent {}

describe('ImrToolbarComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('rendert die Toolbar mit weitergereichter Klasse', () => {
    const toolbar = fixture.debugElement.query(By.css('mat-toolbar.imr-header-toolbar'));

    expect(toolbar).toBeTruthy();
    expect(toolbar.nativeElement.textContent).toContain('Portal');
  });
});
