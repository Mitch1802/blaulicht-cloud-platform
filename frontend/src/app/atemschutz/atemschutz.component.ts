import { Component, OnInit, inject } from '@angular/core';
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
import { ImrCardComponent } from '../imr-ui-library/imr-card.component';
import { ImrHeaderComponent } from '../imr-ui-library/imr-header.component';
import { ImrIconComponent } from '../imr-ui-library/imr-icon.component';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-atemschutz',
    imports: [ImrHeaderComponent, ImrCardComponent, ImrIconComponent, RouterLink],
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
