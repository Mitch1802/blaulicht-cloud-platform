import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import {
  ImrBreadcrumbItem,
  ImrCardComponent,
  ImrHeaderComponent,
  ImrPageLayoutComponent,
} from '../imr-ui-library';
import { IWartungServiceEintrag, IWartungServiceResponse, IWartungServiceSummary } from '../_interface/wartung_service';
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';

@Component({
  selector: 'app-wartung-service',
  imports: [
    MatButtonModule,
    MatIconModule,
    ImrCardComponent,
    ImrHeaderComponent,
    ImrPageLayoutComponent,
    MatTableModule,
    RouterLink,
  ],
  templateUrl: './wartung-service.component.html',
  styleUrl: './wartung-service.component.sass',
})
export class WartungServiceComponent implements OnInit {
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  readonly modul = 'wartung_service';
  readonly title = 'Wartung/Service';

  breadcrumb: ImrBreadcrumbItem[] = [];
  jahr = new Date().getFullYear();
  heute = '';
  summary: IWartungServiceSummary = {
    gesamt: 0,
    ueberfaellig: 0,
    heute: 0,
    anstehend: 0,
  };

  dataSource = new MatTableDataSource<IWartungServiceEintrag>([]);
  sichtbareSpalten: string[] = ['modul', 'bereich', 'eintrag', 'intervall', 'faelligkeit', 'status', 'actions'];

  ngOnInit(): void {
    sessionStorage.setItem('PageNumber', '2');
    sessionStorage.setItem('Page2', 'WS');

    this.breadcrumb = this.navigationService.ladeBreadcrumb();
    this.reload();
  }

  reload(): void {
    this.apiHttpService.get<IWartungServiceResponse>(this.modul).subscribe({
      next: (erg) => {
        this.jahr = Number(erg?.jahr ?? new Date().getFullYear());
        this.heute = String(erg?.heute ?? '');
        this.summary = {
          gesamt: Number(erg?.summary?.gesamt ?? 0),
          ueberfaellig: Number(erg?.summary?.ueberfaellig ?? 0),
          heute: Number(erg?.summary?.heute ?? 0),
          anstehend: Number(erg?.summary?.anstehend ?? 0),
        };
        this.dataSource.data = Array.isArray(erg?.main) ? erg.main : [];
      },
      error: (error: unknown) => {
        this.authSessionService.errorAnzeigen(error);
      },
    });
  }

  statusText(status: string): string {
    if (status === 'ueberfaellig') {
      return 'Überfällig';
    }
    if (status === 'heute') {
      return 'Heute';
    }
    return 'Anstehend';
  }

  statusClass(status: string): string {
    if (status === 'ueberfaellig') {
      return 'status-pill status-pill--ueberfaellig';
    }
    if (status === 'heute') {
      return 'status-pill status-pill--heute';
    }
    return 'status-pill status-pill--anstehend';
  }
}

