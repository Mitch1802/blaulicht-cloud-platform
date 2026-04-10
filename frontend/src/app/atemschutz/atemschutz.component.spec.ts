import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtemschutzComponent } from './atemschutz.component';

describe('AtemschutzComponent', () => {
  let component: AtemschutzComponent;
  let fixture: ComponentFixture<AtemschutzComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtemschutzComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AtemschutzComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

