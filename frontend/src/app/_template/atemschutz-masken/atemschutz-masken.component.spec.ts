import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtemschutzMaskenComponent } from './atemschutz-masken.component';

describe('AtemschutzMaskenComponent', () => {
  let component: AtemschutzMaskenComponent;
  let fixture: ComponentFixture<AtemschutzMaskenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtemschutzMaskenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AtemschutzMaskenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

