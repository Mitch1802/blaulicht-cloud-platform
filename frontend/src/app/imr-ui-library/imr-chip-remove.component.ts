import { Component } from '@angular/core'
import { MatChipsModule } from '@angular/material/chips'

@Component({
  selector: 'imr-chip-remove',
  template: `<span matChipRemove><ng-content></ng-content></span>`,
  standalone: true,
  imports: [MatChipsModule],
})
export class ImrChipRemoveComponent {}