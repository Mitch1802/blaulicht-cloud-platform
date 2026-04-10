import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NavigationService } from 'src/app/_service/navigation.service';
import { ImrBreadcrumbItem, ImrCardComponent, ImrHeaderComponent, ImrPageLayoutComponent } from '../imr-ui-library';

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
      ImrCardComponent,
      MatIconModule,
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

