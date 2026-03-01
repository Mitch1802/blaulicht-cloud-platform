import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-page-layout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="ui-page">
      <header class="ui-page__head">
        <h1>{{ title }}</h1>
        <ng-content select="[uiPageActions]"></ng-content>
      </header>
      <ng-content></ng-content>
    </section>
  `,
})
export class UiPageLayoutComponent {
  @Input({ required: true }) title = '';
}
