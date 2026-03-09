import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { environment } from 'src/environments/environment';


@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.sass'],
    imports: [
        MatToolbar,
        RouterLink,
        MatIconButton,
        MatIconModule
    ]
})
export class HeaderComponent {
  authSessionService = inject(AuthSessionService);

  title: string = environment.title;

  @Input() breadcrumb!: any;

  get hasBreadcrumb(): boolean {
    return Array.isArray(this.breadcrumb) && this.breadcrumb.length > 0;
  }
}
