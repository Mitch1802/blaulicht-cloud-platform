import {
  Component,
  OnInit,
  inject,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Router } from '@angular/router';
import { IMR_UI_COMPONENTS, ImrBreadcrumbItem } from '../imr-ui-library';
import { FormatService } from '../helpers/format.service';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { IPdfTemplate } from '../_interface/pdf_template';
import { MatSelectModule } from '@angular/material/select';

type PdfTemplateApiItem = IPdfTemplate & {
  created_at?: string;
  updated_at?: string;
};

@Component({
  selector: 'app-pdf-templates',
  imports: [
    ...IMR_UI_COMPONENTS,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
    MatSelectModule
  ],
  templateUrl: './pdf-templates.component.html',
  styleUrl: './pdf-templates.component.sass'
})

export class PdfTemplatesComponent implements OnInit {
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  formatService = inject(FormatService);
  router = inject(Router);

  title = 'PDF Templates';
  modul = 'pdf/templates';
  statusFilter: string = 'ALL';

  typModul = [
    'ATEMSCHUTZ',
    'FMD',
    'INVENTAR',
    'VERWALTUNG',
  ];

  pdfTemplateArray: IPdfTemplate[] = [];
  breadcrumb: ImrBreadcrumbItem[] = [];
  dataSource = new MatTableDataSource<IPdfTemplate>(this.pdfTemplateArray);
  sichtbareSpalten: string[] = ['typ', 'version', 'bezeichnung', 'status', 'actions'];

  formModul = new FormGroup({
    id: new FormControl<string | ''>(''),
    typ: new FormControl<string>('', Validators.required),
    version: new FormControl<number>(0),
    bezeichnung: new FormControl<string>('', Validators.required),
    status: new FormControl<string>(''),
    source: new FormControl<string>('', Validators.required),
  });
  
  readonlyMode = false;

  get tableVisible(): boolean {
    return this.formModul.disabled && (this.dataSource?.data?.length ?? 0) > 0;
  }

  private setReadonlyMode(on: boolean): void {
    this.readonlyMode = on;

    // welche Felder sollen NIE editierbar sein?
    this.formModul.controls['status'].disable({ emitEvent: false });
    this.formModul.controls['version'].disable({ emitEvent: false });

    if (on) {
      // Published/Archived: alles sperren
      this.formModul.controls['typ'].disable({ emitEvent: false });
      this.formModul.controls['bezeichnung'].disable({ emitEvent: false });
      this.formModul.controls['source'].disable({ emitEvent: false });
    } else {
      // Draft: editierbar
      this.formModul.controls['typ'].enable({ emitEvent: false });
      this.formModul.controls['bezeichnung'].enable({ emitEvent: false });
      this.formModul.controls['source'].enable({ emitEvent: false });
    }
  }

  applyStatusFilter(): void {
    this.dataSource.filter = JSON.stringify({ status: this.statusFilter });
  }

  ngOnInit(): void {
    sessionStorage.setItem('PageNumber', '2');
    sessionStorage.setItem('Page2', 'PDF');
    this.breadcrumb = this.navigationService.ladeBreadcrumb();

    this.formModul.disable();

    this.dataSource.filterPredicate = (data: IPdfTemplate, filter: string) => {
      const f = JSON.parse(filter || '{}') as { status?: string };
      if (!f.status || f.status === 'ALL') return true;
      return (data.status || '').toUpperCase() === f.status.toUpperCase();
    };

    this.apiHttpService.get<PdfTemplateApiItem[]>(this.modul).subscribe({
      next: (erg: PdfTemplateApiItem[]) => {
        try {
          this.pdfTemplateArray = this.convertNewsDate(erg);
          this.dataSource.data = this.pdfTemplateArray;
          this.applyStatusFilter();
        } catch (e: unknown) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: unknown) => this.authSessionService.errorAnzeigen(error)
    });
  }

  convertNewsDate(data: PdfTemplateApiItem[]): IPdfTemplate[] {
    for (let i = 0; i < data.length; i++) {
      const published_at = String(data[i].updated_at).split('T');
      const published_at_date = published_at[0];
      const published_at_time = published_at[1]?.split(':') ?? [];
      data[i].published_at = published_at_date + '_' + published_at_time[0] + ':' + published_at_time[1];

      const created_at = String(data[i].created_at).split('T');
      const created_at_date = created_at[0];
      const created_at_time = created_at[1]?.split(':') ?? [];
      data[i].created_at = created_at_date + '_' + created_at_time[0] + ':' + created_at_time[1];

      const updated_at = String(data[i].updated_at).split('T');
      const updated_at_date = updated_at[0];
      const updated_at_time = updated_at[1]?.split(':') ?? [];
      data[i].updated_at = updated_at_date + '_' + updated_at_time[0] + ':' + updated_at_time[1];
    }
    return data;
  }

  datenLoeschen(): void {
    const id = this.formModul.controls['id'].value!;
    this.apiHttpService.delete(this.modul, id).subscribe({
      next: () => {
        try {
          this.pdfTemplateArray = this.pdfTemplateArray.filter(n => n.id !== id);
          this.dataSource.data = this.pdfTemplateArray;
          this.resetFormNachAktion();
          this.uiMessageService.erstelleMessage('success', 'Inventar erfolgreich gelöscht!');
        } catch (e: unknown) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: unknown) => this.authSessionService.errorAnzeigen(error)
    });
  }

  auswahlBearbeiten(element: IPdfTemplate): void {
    if (!element.id || element.id === '0') {
      return;
    }
    const abfrageUrl = `${this.modul}/${element.id}`;
    this.apiHttpService.get<IPdfTemplate>(abfrageUrl).subscribe({
      next: (erg: IPdfTemplate) => {
        try {
          const details: IPdfTemplate = erg;
          this.formModul.enable();
          this.formModul.setValue({
            id: details.id!,
            typ: details.typ,
            version: details.version,
            bezeichnung: details.bezeichnung,
            status: details.status,
            source: details.source,
          });
          this.setReadonlyMode(details.status === 'PUBLISHED' || details.status === 'ARCHIVED');
        } catch (e: unknown) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: unknown) => this.authSessionService.errorAnzeigen(error)
    });
  }

  publish(element: IPdfTemplate): void {
    if (!element?.id) return;
    const abfrageUrl = `${this.modul}/${element.id}/publish`;
    const payload = {};

    this.apiHttpService.post<IPdfTemplate>(abfrageUrl, payload).subscribe({
      next: (erg: IPdfTemplate) => {
        try {
          const updated = erg;
          this.pdfTemplateArray = this.pdfTemplateArray
            .map(m => m.id === updated.id ? updated : m)
            .sort((a, b) => (a.typ || '').localeCompare(b.typ || ''));

          this.dataSource.data = this.pdfTemplateArray;
          this.applyStatusFilter();
        } catch (e: unknown) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: unknown) => this.authSessionService.errorAnzeigen(error)
    });
  }

  newVersion(element: IPdfTemplate): void {
    if (!element?.id) return;
    const abfrageUrl = `${this.modul}/${element.id}/new-version`;
    const payload = {};

    this.apiHttpService.post<IPdfTemplate>(abfrageUrl, payload).subscribe({
      next: (erg: IPdfTemplate) => {
        try {
          const newMask: IPdfTemplate = erg;
          this.pdfTemplateArray.push(newMask);
          this.pdfTemplateArray.sort((a, b) => {
            const typCompare = a.typ.localeCompare(b.typ);
            if (typCompare !== 0) {
              return typCompare;
            }
            return b.version - a.version;
          });
          this.dataSource.data = this.pdfTemplateArray;
          this.applyStatusFilter();
        } catch (e: unknown) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: unknown) => this.authSessionService.errorAnzeigen(error)
    });
  }

  test(element: IPdfTemplate): void {
    if (!element?.id) return;
    const abfrageUrl = `${this.modul}/${element.id}/test`;
    const payload = { print_fold_lines: true };

    this.apiHttpService.postBlob(abfrageUrl, payload).subscribe({
      next: (blob: Blob) => {
        if (blob.size === 0) {
          this.uiMessageService.erstelleMessage('error', 'PDF ist leer (0 Bytes).');
          return;
        }

        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: (error: unknown) => this.authSessionService.errorAnzeigen(error)
    });
  }

  abbrechen(): void {
    this.resetFormNachAktion();
    this.uiMessageService.erstelleMessage('info', 'Pdf Template nicht gespeichert!');
  }

  neueDetails(): void {
    this.formModul.enable();
    this.formModul.patchValue({ id: '', typ: '', version: 1, bezeichnung: '', status: 'DRAFT', source: '' });
    this.setReadonlyMode(false);
  }

  datenSpeichern(): void {
    const idValue = this.formModul.controls['id'].value || '';
    const typ = this.formModul.controls['typ'].value!;
    const version = this.formModul.controls['version'].value!;
    const bezeichnung = this.formModul.controls['bezeichnung'].value!;
    const status = this.formModul.controls['status'].value!;
    const source = this.formModul.controls['source'].value!;

    if (!idValue) {
      this.apiHttpService.post<IPdfTemplate>(this.modul, { typ, version, bezeichnung, status, source }, false).subscribe({
        next: (erg: IPdfTemplate) => {
          try {
            const newMask: IPdfTemplate = erg;
            this.pdfTemplateArray.push(newMask);
            this.pdfTemplateArray = this.collectionUtilsService.arraySortByKey(this.pdfTemplateArray, 'typ');
            this.dataSource.data = this.pdfTemplateArray;
            this.resetFormNachAktion();
            this.uiMessageService.erstelleMessage('success', 'Pdf Template erfolgreich gespeichert!');
            this.applyStatusFilter();
          } catch (e: unknown) {
            this.uiMessageService.erstelleMessage('error', String(e));
          }
        },
        error: (error: unknown) => this.authSessionService.errorAnzeigen(error)
      });

    } else {
      this.apiHttpService.patch<IPdfTemplate>(this.modul, idValue, { typ, version, bezeichnung, status, source }, false).subscribe({
        next: (erg: IPdfTemplate) => {
          try {
            const updated = erg;
            this.pdfTemplateArray = this.pdfTemplateArray
              .map(m => m.id === updated.id ? updated : m)
              .sort((a, b) => (a.typ || '').localeCompare(b.typ || ''));

            this.dataSource.data = this.pdfTemplateArray;
            this.resetFormNachAktion();
            this.uiMessageService.erstelleMessage('success', 'Pdf Template erfolgreich geändert!');
            this.applyStatusFilter();
          } catch (e: unknown) {
            this.uiMessageService.erstelleMessage('error', String(e));
          }
        },
        error: (error: unknown) => this.authSessionService.errorAnzeigen(error)
      });
    }
  }

  private resetFormNachAktion(): void {
    this.formModul.reset({ id: '', typ: '', version: 0, bezeichnung: '', status: '', source: '' });
    this.formModul.disable();
  }
}
