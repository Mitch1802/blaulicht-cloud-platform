import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtemschutzDienstbuchComponent } from './atemschutz-dienstbuch.component';

describe('AtemschutzDienstbuchComponent', () => {
  let component: AtemschutzDienstbuchComponent;
  let fixture: ComponentFixture<AtemschutzDienstbuchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtemschutzDienstbuchComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AtemschutzDienstbuchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

