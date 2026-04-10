import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModulKonfigurationComponent } from './modul-konfiguration.component';

describe('ModulKonfigurationComponent', () => {
  let component: ModulKonfigurationComponent;
  let fixture: ComponentFixture<ModulKonfigurationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModulKonfigurationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModulKonfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

