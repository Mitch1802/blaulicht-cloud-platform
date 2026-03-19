import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ImrListItemComponent } from '../imr-list-item.component';
import { ImrListComponent } from './imr-list.component';

@Component({
  standalone: true,
  imports: [ImrListComponent, ImrListItemComponent],
  template: `
    <imr-list listClass="inventory-list">
      <imr-list-item itemClass="item-row">Position A</imr-list-item>
      <imr-list-item itemClass="item-row">Position B</imr-list-item>
    </imr-list>
  `,
})
class HostComponent {}

describe('ImrListComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('rendert Liste und Listenelemente ueber die IMR-Wrapper', () => {
    const list = fixture.debugElement.query(By.css('mat-list.inventory-list'));
    const items = fixture.debugElement.queryAll(By.css('mat-list-item.item-row'));

    expect(list).toBeTruthy();
    expect(items.length).toBe(2);
    expect(items[0].nativeElement.textContent).toContain('Position A');
  });
});
