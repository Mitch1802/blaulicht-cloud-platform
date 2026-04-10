import { booleanAttribute, Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatCardModule } from '@angular/material/card'

/**
 * imr-card
 *
 * Wrapper around mat-card to provide a consistent, styled card container.
 * Replaces direct usage of <mat-card>.
 */
@Component({
  selector: 'imr-card',
  templateUrl: './imr-card.component.html',
  styleUrl: './imr-card.component.sass',
  standalone: true,
  imports: [CommonModule, MatCardModule],
})
export class ImrCardComponent {
  @Input() cardClass = 'imr-card'
  @Input({ transform: booleanAttribute }) wrapContent = true
}



