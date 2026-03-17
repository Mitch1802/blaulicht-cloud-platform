import { Component, OnInit, inject } from '@angular/core';
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
import { ImrHeaderComponent } from '../imr-ui-library';
import { MatCardModule } from '@angular/material/card';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-atemschutz',
    imports: [ImrHeaderComponent, MatCardModule, MatIconModule, RouterLink],
    templateUrl: './atemschutz.component.html',
    styleUrl: './atemschutz.component.sass'
})
export class AtemschutzComponent implements OnInit {
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  title = "Atemschutz";
  modul = "atemschutz";

  breadcrumb: any = [];

  ngOnInit(): void {
    sessionStorage.setItem("PageNumber", "2");
    sessionStorage.setItem("Page2", "ATM");
    this.breadcrumb = this.navigationService.ladeBreadcrumb();

    // this.apiHttpService.get(this.modul).subscribe({
    //   next: (erg: any) => {
    //     try {
          
    //     } catch (e: any) {
    //       this.uiMessageService.erstelleMessage("error", e);
    //     }
    //   },
    //   error: (error: any) => {
    //     this.authSessionService.errorAnzeigen(error);
    //   }
    // });
  }
}
