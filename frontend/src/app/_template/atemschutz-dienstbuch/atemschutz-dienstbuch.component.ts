import { Component, OnInit, QueryList, ViewChild, ViewChildren, inject } from '@angular/core';
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
import { HeaderComponent } from '../header/header.component';
import { MatCardModule } from '@angular/material/card';
import { IAtemschutzGeraetProtokoll } from 'src/app/_interface/atemschutz_geraet_protokoll';
import { IMitglied } from 'src/app/_interface/mitglied';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-atemschutz-dienstbuch',
  imports: [
    HeaderComponent,
    MatCardModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './atemschutz-dienstbuch.component.html',
  styleUrl: './atemschutz-dienstbuch.component.sass'
})
export class AtemschutzDienstbuchComponent implements OnInit {
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  title = "Dienstbuch verwalten";
  modul = "atemschutz/geraete/dienstbuch";

  breadcrumb: any = [];
  jahrHeuer: number = new Date().getFullYear();
  dauerHeuer: number = 0;
  jahrLetztesJahr: number = this.jahrHeuer - 1;
  dauerLetztesJahr: number = 0;

  protokoll: IAtemschutzGeraetProtokoll[] = [];
  mitglieder: IMitglied[] = [];
  list_protokoll_mitglieder: any[] = [];

  pageOptions: any[] = [10, 50, 100]
  sichtbareSpalten: string[] = ['datum', 'verwendung_typ', 'verwendung_min', 'stbnr', 'vorname', 'nachname'];
  dataSource = new MatTableDataSource<any>(this.list_protokoll_mitglieder);

  @ViewChild(MatPaginator, { static: false }) paginator?: MatPaginator;
  @ViewChildren(MatSort) sorts?: QueryList<MatSort>;

  ngOnInit(): void {
    sessionStorage.setItem("PageNumber", "3");
    sessionStorage.setItem("Page3", "ATM_DB");
    this.breadcrumb = this.navigationService.ladeBreadcrumb();

    this.apiHttpService.get(this.modul).subscribe({
      next: (erg: any) => {
        try {
          this.protokoll = Array.isArray(erg.protokoll) ? erg.protokoll : [];
          this.mitglieder = Array.isArray(erg.mitglieder) ? erg.mitglieder : [];

          // **VORFILTER**: nur E oder Ü
          const erlaubteTypen = ['E', 'Ü'];
          const gefilterteProtokolle = this.protokoll.filter(p =>
            erlaubteTypen.includes((p.verwendung_typ ?? '').toUpperCase())
          );

          // Map: mitglieder.pkid → Mitglied
          const mitgliederMap = new Map<number, IMitglied>(
            this.mitglieder.map((m: IMitglied) => [m.pkid, m])
          );

          // Nur die gefilterten Protokolle joinen
          this.list_protokoll_mitglieder = gefilterteProtokolle.map((p: IAtemschutzGeraetProtokoll) => {
            const mitglied =
              p.mitglied_id != null ? mitgliederMap.get(p.mitglied_id) : undefined;

            return {
              ...p,
              stbnr: mitglied?.stbnr ?? null,
              vorname: mitglied?.vorname ?? '',
              nachname: mitglied?.nachname ?? '',
            };
          });

          this.dataSource = new MatTableDataSource(this.list_protokoll_mitglieder);
          this.dataSource.paginator = this.paginator ?? null;
          this.dataSource.sort = this.sorts?.first ?? null;

          this.summenBerechnen(this.protokoll);
        } catch (e: any) {
          this.uiMessageService.erstelleMessage("error", e);
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  applyFilter(value: string): void {
    this.dataSource.filter = (value || '').trim().toLowerCase();
    this.paginator?.firstPage();
  }

  summenBerechnen(liste: IAtemschutzGeraetProtokoll[]): void {
    for (const l of liste) {
      const y = new Date(l.datum).getFullYear();
      const d = l.verwendung_min;

      if (y == this.jahrHeuer) {
        this.dauerHeuer += d;
      }else if (y == this.jahrLetztesJahr) {
        this.dauerLetztesJahr += d;
      }
    }

    console.log(this.dauerHeuer);
    console.log(this.dauerLetztesJahr);
  }

  formatDauer(dauer: number): string {
    if (dauer >= 60) {
      return (dauer / 60).toFixed(2) + ' h oder ' + dauer + ' min'
    }else {
      return dauer + ' min'
    }
    
  }
}
