import { Component, Input } from '@angular/core';
import { ImrHeaderComponent } from 'src/app/imr-ui-library/imr-header.component';
import type { ImrBreadcrumbItem } from 'src/app/imr-ui-library/imr-header.component';

/**
 * @deprecated Verwende `<imr-header>` aus der IMR UI Library.
 * Diese Komponente bleibt aus Backward-Compatibility-Gründen erhalten.
 */
@Component({
    selector: 'app-header',
    standalone: true,
    imports: [ImrHeaderComponent],
    template: `<imr-header [breadcrumb]="breadcrumb"></imr-header>`,
})
export class HeaderComponent {
  @Input() breadcrumb: ImrBreadcrumbItem[] = [];
}
