import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavigationService } from 'src/app/_service/navigation.service';
import { ImrCardComponent } from '../imr-ui-library/imr-card.component';
import { ImrHeaderComponent } from '../imr-ui-library/imr-header.component';
import { ImrIconComponent } from '../imr-ui-library/imr-icon.component';

@Component({
    selector: 'app-atemschutz',
    imports: [ImrHeaderComponent, ImrCardComponent, ImrIconComponent, RouterLink],
    templateUrl: './atemschutz.component.html',
    styleUrl: './atemschutz.component.sass'
})
export class AtemschutzComponent implements OnInit {
  private navigationService = inject(NavigationService);
  title = 'Atemschutz';

  breadcrumb: any = [];

  ngOnInit(): void {
    sessionStorage.setItem('PageNumber', '2');
    sessionStorage.setItem('Page2', 'ATM');
    this.breadcrumb = this.navigationService.ladeBreadcrumb();
  }
}
