import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewsExternComponent } from './news-extern.component';

describe('NewsComponent', () => {
  let component: NewsExternComponent;
  let fixture: ComponentFixture<NewsExternComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewsExternComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewsExternComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

