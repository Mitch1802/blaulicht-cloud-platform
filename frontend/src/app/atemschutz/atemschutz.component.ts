import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavigationService } from 'src/app/_service/navigation.service';
import { ImrCardComponent } from '../imr-ui-library/imr-card.component';
import { ImrBreadcrumbItem, ImrHeaderComponent } from '../imr-ui-library/imr-header.component';
import { ImrIconComponent } from '../imr-ui-library/imr-icon.component';
import { ImrPageLayoutComponent } from '../imr-ui-library/imr-page-layout.component';
import { ImrSectionCardComponent } from '../imr-ui-library/imr-section-card.component';

type AtemschutzModul = {
  titel: string;
  icon: string;
  routerLink: string;
};

@Component({
    selector: 'app-atemschutz',
    imports: [
      ImrHeaderComponent,
      ImrPageLayoutComponent,
      ImrSectionCardComponent,
      ImrCardComponent,
      ImrIconComponent,
      RouterLink
    ],
    templateUrl: './atemschutz.component.html',
    styleUrl: './atemschutz.component.sass'
})
export class AtemschutzComponent implements OnInit {
  private navigationService = inject(NavigationService);
  title = 'Atemschutz';

  breadcrumb: ImrBreadcrumbItem[] = [];

  readonly moduleCards: AtemschutzModul[] = [
    { titel: 'Masken', icon: 'sports_motorsports', routerLink: '/atemschutz/masken' },
    { titel: 'Geräte', icon: 'battery_alert', routerLink: '/atemschutz/geraete' },
    { titel: 'Messgeräte', icon: 'flare', routerLink: '/atemschutz/messgeraete' },
    { titel: 'Dienstbuch', icon: 'menu_book', routerLink: '/atemschutz/dienstbuch' }
  ];

  ngOnInit(): void {
    sessionStorage.setItem('PageNumber', '2');
    sessionStorage.setItem('Page2', 'ATM');
    this.breadcrumb = this.navigationService.ladeBreadcrumb();
  }
}
