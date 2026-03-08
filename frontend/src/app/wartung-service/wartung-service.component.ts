import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

import { HeaderComponent } from '../_template/header/header.component';
import { IWartungServiceEintrag, IWartungServiceResponse, IWartungServiceSummary } from '../_interface/wartung_service';
import { GlobalDataService } from '../_service/global-data.service';

@Component({
  selector: 'app-wartung-service',
  imports: [
    HeaderComponent,
    MatCardModule,
    MatTableModule,
    MatButton,
    MatIcon,
    RouterLink,
  ],
  templateUrl: './wartung-service.component.html',
  styleUrl: './wartung-service.component.sass',
})
export class WartungServiceComponent implements OnInit {
  private globalDataService = inject(GlobalDataService);

  readonly modul = 'wartung_service';
  readonly title = 'Wartung/Service';

  breadcrumb: any[] = [];
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

    this.breadcrumb = this.globalDataService.ladeBreadcrumb();
    this.reload();
  }

  reload(): void {
    this.globalDataService.get<IWartungServiceResponse>(this.modul).subscribe({
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
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
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
