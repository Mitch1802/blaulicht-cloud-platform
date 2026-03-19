import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatCardModule } from '@angular/material/card';
import { By } from '@angular/platform-browser';

import { ImrCardContentComponent } from './imr-card-content.component';

@Component({
  standalone: true,
  imports: [MatCardModule, ImrCardContentComponent],
  template: `
    <mat-card>
      <imr-card-content contentClass="imr-card__content">
        <p class="card-copy">Beispielinhalt</p>
      </imr-card-content>
    </mat-card>
  `,
})
class HostComponent {}

describe('ImrCardContentComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('rendert mat-card-content mit uebergebener CSS-Klasse', () => {
    const cardContent = fixture.debugElement.query(By.css('mat-card-content.imr-card__content'));

    expect(cardContent).toBeTruthy();
    expect(cardContent.nativeElement.textContent).toContain('Beispielinhalt');
  });
});
