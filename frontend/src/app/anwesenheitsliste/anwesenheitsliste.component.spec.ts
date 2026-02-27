import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnwesenheitslisteComponent } from './anwesenheitsliste.component';

describe('AnwesenheitslisteComponent', () => {
  let component: AnwesenheitslisteComponent;
  let fixture: ComponentFixture<AnwesenheitslisteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnwesenheitslisteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnwesenheitslisteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
