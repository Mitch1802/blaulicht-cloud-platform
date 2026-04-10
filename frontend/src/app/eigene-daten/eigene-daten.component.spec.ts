import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EigeneDatenComponent } from './eigene-daten.component';

describe('EigeneDatenComponent', () => {
  let component: EigeneDatenComponent;
  let fixture: ComponentFixture<EigeneDatenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EigeneDatenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EigeneDatenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

