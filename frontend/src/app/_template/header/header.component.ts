import { Component, OnInit, Input, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GlobalDataService } from 'src/app/_service/global-data.service';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { environment } from 'src/environments/environment';
import { AsyncPipe } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';


@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.sass'],
    imports: [
        MatToolbar,
        RouterLink,
        MatIconButton,
        MatIconModule,
        MatButton,
        MatProgressBarModule,
        AsyncPipe
    ]
})
export class HeaderComponent {
  globalDataService = inject(GlobalDataService);
  private router = inject(Router);

  title: string = environment.title;

  loading$ = this.globalDataService.loading$;

  @Input() breadcrumb!: any;

  onClick(link: string): void {
    this.globalDataService.ladeBreadcrumb();
    this.router.navigate([link]);
  }
}
