import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtemschutzGeraeteComponent } from './atemschutz-geraete.component';

describe('AtemschutzComponent', () => {
  let component: AtemschutzGeraeteComponent;
  let fixture: ComponentFixture<AtemschutzGeraeteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtemschutzGeraeteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AtemschutzGeraeteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

