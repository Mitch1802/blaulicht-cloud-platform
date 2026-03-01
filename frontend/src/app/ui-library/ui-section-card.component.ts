import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'ui-section-card',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <mat-card class="ui-card">
      @if (title) {
        <div class="ui-card__head">
          <h2>{{ title }}</h2>
          <ng-content select="[uiCardActions]"></ng-content>
        </div>
      }
      <mat-card-content class="ui-card__content">
        <ng-content></ng-content>
      </mat-card-content>
    </mat-card>
  `,
})
export class UiSectionCardComponent {
  @Input() title = '';
}
