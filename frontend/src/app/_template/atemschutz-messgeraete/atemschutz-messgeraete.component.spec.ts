import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtemschutzMessgeraeteComponent } from './atemschutz-messgeraete.component';

describe('AtemschutzMessgeraeteComponent', () => {
  let component: AtemschutzMessgeraeteComponent;
  let fixture: ComponentFixture<AtemschutzMessgeraeteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtemschutzMessgeraeteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AtemschutzMessgeraeteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

