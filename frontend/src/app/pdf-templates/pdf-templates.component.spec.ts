import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfTemplatesComponent } from './pdf-templates.component';

describe('PdfTemplatesComponent', () => {
  let component: PdfTemplatesComponent;
  let fixture: ComponentFixture<PdfTemplatesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfTemplatesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfTemplatesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

