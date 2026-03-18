import { Component } from '@angular/core'
import { MatFormFieldModule } from '@angular/material/form-field'

@Component({
  selector: 'imr-suffix',
  template: `<span matSuffix><ng-content></ng-content></span>`,
  standalone: true,
  imports: [MatFormFieldModule],
})
export class ImrSuffixComponent {}