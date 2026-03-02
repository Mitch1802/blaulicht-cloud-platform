import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GlobalDataService } from 'src/app/_service/global-data.service';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
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
        MatProgressBarModule,
        AsyncPipe
    ]
})
export class HeaderComponent {
  globalDataService = inject(GlobalDataService);

  title: string = environment.title;

  loading$ = this.globalDataService.loading$;

  @Input() breadcrumb!: any;

  get hasBreadcrumb(): boolean {
    return Array.isArray(this.breadcrumb) && this.breadcrumb.length > 0;
  }
}
