import { booleanAttribute, Component, Input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'imr-icon',
  templateUrl: './imr-icon.component.html',
  styleUrl: './imr-icon.component.sass',
  standalone: true,
  imports: [MatIconModule],
})
export class ImrIconComponent {
  @Input() fontSet = ''
  @Input() fontIcon = ''
  @Input() svgIcon = ''
  @Input({ transform: booleanAttribute }) inline = false
}

