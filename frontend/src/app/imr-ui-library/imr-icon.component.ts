import { booleanAttribute, Component, Input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'imr-icon',
  template: `
    @if (svgIcon) {
      <mat-icon [svgIcon]="svgIcon" [inline]="inline">
        <ng-content></ng-content>
      </mat-icon>
    } @else {
      <mat-icon [fontSet]="fontSet" [fontIcon]="fontIcon" [inline]="inline">
        <ng-content></ng-content>
      </mat-icon>
    }
  `,
  standalone: true,
  imports: [MatIconModule],
})
export class ImrIconComponent {
  @Input() fontSet = ''
  @Input() fontIcon = ''
  @Input() svgIcon = ''
  @Input({ transform: booleanAttribute }) inline = false
}