import { Component, OnInit, Input, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GlobalDataService } from 'src/app/_service/global-data.service';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
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
        MatStepperModule,
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

  get activeBreadcrumbIndex(): number {
    if (!Array.isArray(this.breadcrumb) || this.breadcrumb.length === 0) {
      return 0;
    }

    const activeIndex = this.breadcrumb.findIndex((entry: any) => entry?.active === true);
    if (activeIndex >= 0) {
      return activeIndex;
    }

    return this.breadcrumb.length - 1;
  }

  onClick(link: string): void {
    this.globalDataService.ladeBreadcrumb();
    this.router.navigate([link]);
  }

  onStepperSelection(index: number): void {
    if (!Array.isArray(this.breadcrumb) || index < 0 || index >= this.breadcrumb.length) {
      return;
    }

    const selected = this.breadcrumb[index];
    if (selected?.link) {
      this.onClick(selected.link);
    }
  }
}
