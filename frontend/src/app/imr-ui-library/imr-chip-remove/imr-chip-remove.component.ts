import { Component } from '@angular/core'
import { MatChipsModule } from '@angular/material/chips'

@Component({
  selector: 'imr-chip-remove',
  templateUrl: './imr-chip-remove.component.html',
  styleUrl: './imr-chip-remove.component.sass',
  standalone: true,
  imports: [MatChipsModule],
})
export class ImrChipRemoveComponent {}

