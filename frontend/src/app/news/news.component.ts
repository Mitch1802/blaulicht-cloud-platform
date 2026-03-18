import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { INews } from 'src/app/_interface/news';
import { INewsTemplate } from 'src/app/_interface/news-template';
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { A11yModule } from '@angular/cdk/a11y';
import { MatOption } from '@angular/material/core';
import { MatButton } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ImrHeaderComponent } from '../imr-ui-library';
import { MatIcon } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';

@Component({
  selector: 'app-news',
  imports: [
    ImrHeaderComponent,
    MatCardModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatButton,
    MatInputModule,
    MatIcon,
    MatError,
    A11yModule,
    MatAutocompleteModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule
  ],
  templateUrl: './news.component.html',
  styleUrl: './news.component.sass'
})
export class NewsComponent implements OnInit {
  @ViewChild('fotoUpload', { static: false }) fotoRef!: ElementRef<HTMLInputElement>;

  @ViewChild(MatPaginator) set matPaginator(p: MatPaginator | undefined) {
    if (p) {
      this.newsDataSource.paginator = p;
    }
  }

  @ViewChild(MatSort) set matSort(s: MatSort | undefined) {
    if (s) {
      this.newsDataSource.sort = s;
    }
  }
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);

  title = 'News Verwaltung';
  modul = 'news/intern';
  modulTemplates = 'news/templates';
  breadcrumb: any[] = [];

  newsArray: INews[] = [];
  newsDataSource = new MatTableDataSource<INews>([]);
  sichtbareSpaltenNews: string[] = ['created_at', 'title', 'typ', 'actions'];
  templateArray: INewsTemplate[] = [];
  btnText = 'Bild auswählen';
  fileName = '';
  filePfad = '';
  fileFound = false;
  btnUploadStatus = false;
  imageModalOpen = false;
  isEditMode = false;
  private selectedPreviewUrl = '';
  private focusBeforePhotoModal: HTMLElement | null = null;

  get uploadLimitMb(): number {
    return Math.round((this.apiHttpService.MaxUploadSize / 1024) * 10) / 10;
  }

  private normalizeFilterValue(value: string): string {
    return String(value || '').trim().toLowerCase();
  }

  formAuswahl = new FormGroup({
    news: new FormControl<number | ''>('')
  });

  formModul = new FormGroup({
    id: new FormControl<string | ''>(''),
    template_id: new FormControl<string | ''>(''),
    template_name: new FormControl<string>('', { nonNullable: true }),
    title: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    text: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    typ: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    // nur für Anzeige/Modal – NICHT ans Backend senden
    foto_url: new FormControl<string>(''),
  });

  ngOnInit(): void {
    sessionStorage.setItem('PageNumber', '2');
    sessionStorage.setItem('Page2', 'NEWS');
    this.breadcrumb = this.navigationService.ladeBreadcrumb();

    this.formModul.disable();
    this.isEditMode = false;

    forkJoin({
      newsResponse: this.apiHttpService.get(this.modul),
      templateResponse: this.apiHttpService.get(this.modulTemplates),
    }).subscribe({
      next: ({ newsResponse, templateResponse }: any) => {
        try {
          this.newsArray = this.convertNewsDate(newsResponse) as INews[];
          this.newsDataSource.data = this.newsArray;
          this.templateArray = this.sortTemplates(templateResponse as INewsTemplate[]);
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  private sortTemplates(data: INewsTemplate[] = []): INewsTemplate[] {
    return [...(data || [])].sort((a, b) =>
      String(a?.name || '').localeCompare(String(b?.name || ''), 'de')
    );
  }

  vorlageAnwenden(): void {
    const templateId = this.formModul.controls['template_id'].value;
    if (!templateId) {
      this.uiMessageService.erstelleMessage('info', 'Bitte zuerst eine Vorlage auswählen.');
      return;
    }

    const selected = this.templateArray.find((tpl) => String(tpl.id) === String(templateId));
    if (!selected) {
      this.uiMessageService.erstelleMessage('error', 'Vorlage konnte nicht geladen werden.');
      return;
    }

    this.formModul.patchValue({
      template_name: selected.name || '',
      title: selected.title || '',
      text: selected.text || '',
      typ: selected.typ || 'intern',
    });
    this.uiMessageService.erstelleMessage('success', 'Vorlage zum Bearbeiten geladen.');
  }

  vorlageLoeschen(): void {
    const templateId = this.formModul.controls['template_id'].value;
    if (!templateId) {
      this.uiMessageService.erstelleMessage('info', 'Bitte zuerst eine Vorlage auswählen.');
      return;
    }

    const selected = this.templateArray.find((tpl) => String(tpl.id) === String(templateId));
    const templateName = selected?.name || 'Vorlage';
    const confirmDelete = window.confirm(`Vorlage "${templateName}" wirklich löschen?`);
    if (!confirmDelete) {
      return;
    }

    this.apiHttpService.delete(this.modulTemplates, templateId).subscribe({
      next: () => {
        this.templateArray = this.templateArray.filter((tpl) => String(tpl.id) !== String(templateId));
        this.formModul.patchValue({ template_id: '', template_name: '' });
        this.uiMessageService.erstelleMessage('success', 'Vorlage gelöscht.');
      },
      error: (error: any) => this.authSessionService.errorAnzeigen(error),
    });
  }

  vorlageSpeichern(): void {
    const templateId = this.formModul.controls['template_id'].value;
    const name = (this.formModul.controls['template_name'].value || '').trim();
    const title = this.formModul.controls['title'].value || '';
    const text = this.formModul.controls['text'].value || '';
    const typ = this.formModul.controls['typ'].value || 'intern';

    if (!name || !title || !text) {
      this.uiMessageService.erstelleMessage('error', 'Vorlagenname, Titel und Text sind erforderlich.');
      return;
    }

    const payload = {
      name,
      title,
      text,
      typ,
      active: true,
    };

    const request$ = templateId
      ? this.apiHttpService.patch(this.modulTemplates, templateId, payload, false)
      : this.apiHttpService.post(this.modulTemplates, payload, false);

    request$.subscribe({
      next: (erg: any) => {
        const savedId = String(erg?.id || templateId || '');
        this.apiHttpService.get(this.modulTemplates).subscribe({
          next: (templates: any) => {
            this.templateArray = this.sortTemplates(templates as INewsTemplate[]);
            this.formModul.patchValue({
              template_id: savedId,
              template_name: String(erg?.name || name),
            });
            this.uiMessageService.erstelleMessage('success', templateId ? 'Vorlage aktualisiert.' : 'Vorlage gespeichert.');
          },
          error: (error: any) => this.authSessionService.errorAnzeigen(error),
        });
      },
      error: (error: any) => this.authSessionService.errorAnzeigen(error),
    });
  }

  /** Datei aus dem ViewChild-input holen */
  private getSelectedFile(): File | null {
    const el = this.fotoRef?.nativeElement;
    return el?.files && el.files.length ? el.files[0] : null;
  }

  /** Server-Datum ins gewünschte Anzeigeformat bringen */
  convertNewsDate(data: any): any[] {
    for (let i = 0; i < data.length; i++) {
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

  private normalizeNewsItem(item: any): INews {
    const normalized = this.convertNewsDate([item])[0];
    return normalized as INews;
  }

  getNewsExcerpt(text: string | undefined): string {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (normalized.length <= 110) {
      return normalized;
    }
    return `${normalized.slice(0, 107)}...`;
  }

  setzeSelectZurueck(): void {
    this.formAuswahl.controls['news'].setValue('', { onlySelf: true });
  }

  datenLoeschen(): void {
    const id = this.formModul.controls['id'].value!;
    this.auswahlLoeschen(id);
  }

  auswahlLoeschen(id: any): void {
    if (id === 0) {
      return;
    }
    this.apiHttpService.delete(this.modul, id).subscribe({
      next: (erg: any) => {
        try {
          this.newsArray = this.newsArray.filter(n => n.id !== id);
          this.newsDataSource.data = this.newsArray;
          this.resetFormNachAktion();
          this.uiMessageService.erstelleMessage('success', 'News erfolgreich gelöscht!');
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => this.authSessionService.errorAnzeigen(error)
    });
  }

  auswahlBearbeiten(element: any): void {
    if (element.id === 0) {
      return;
    }
    const abfrageUrl = `${this.modul}/${element.id}`;
    this.apiHttpService.get(abfrageUrl).subscribe({
      next: (erg: any) => {
        try {
          let details: INews = erg;
          this.formModul.enable();
          this.isEditMode = true;
          this.btnUploadStatus = true;

          // UI-Status für bestehendes Bild
          if ((details as any).foto_url) {
            this.btnText = 'Bild ersetzen';
            const parts = (details as any).foto_url.split('/');
            this.fileName = parts[parts.length - 1];
            this.fileFound = true;
            this.filePfad = (details as any).foto_url;
          } else {
            this.btnText = 'Bild auswählen';
            this.fileName = '';
            this.fileFound = false;
            this.filePfad = '';
          }

          this.formModul.setValue({
            id: details.id!,
            template_id: '',
            template_name: '',
            title: details.title,
            text: details.text,
            typ: details.typ,
            foto_url: ''
          });
          this.setzeSelectZurueck();
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => this.authSessionService.errorAnzeigen(error)
    });
  }

  abbrechen(): void {
    this.uiMessageService.erstelleMessage('info', 'News nicht gespeichert!');
    this.resetFormNachAktion();
  }

  neueDetails(): void {
    this.formModul.enable();
    this.isEditMode = true;
    this.btnUploadStatus = true;
    this.btnText = 'Bild auswählen';
    this.fileName = '';
    this.filePfad = '';
    this.fileFound = false;
    this.formModul.patchValue({ id: '', template_id: '', template_name: '', title: '', text: '', typ: 'intern', foto_url: '' });
    this.setzeSelectZurueck();

    // Datei-Auswahl im Input zurücksetzen
    if (this.fotoRef?.nativeElement) {
      this.fotoRef.nativeElement.value = '';
    }
  }

  datenSpeichern(): void {
    const idValue = this.formModul.controls['id'].value || '';
    const title = this.formModul.controls['title'].value!;
    const text = this.formModul.controls['text'].value!;
    const typ = this.formModul.controls['typ'].value!;
    const file = this.getSelectedFile();

    if (!idValue) {
      // CREATE
      if (file) {
        const fd = new FormData();
        fd.append('title', title);
        fd.append('text', text);
        fd.append('typ', typ);
        fd.append('foto', file, file.name || 'upload.png');

        this.apiHttpService.post(this.modul, fd, true).subscribe({
          next: (erg: any) => {
            try {
              const normalized = this.normalizeNewsItem(erg);
              this.newsArray.push(normalized);
              this.newsDataSource.data = this.newsArray;
              this.resetFormNachAktion();
              this.uiMessageService.erstelleMessage('success', 'News erfolgreich gespeichert!');
            } catch (e: any) {
              this.uiMessageService.erstelleMessage('error', e);
            }
          },
          error: (error: any) => this.authSessionService.errorAnzeigen(error)
        });
      } else {
        // JSON ohne Bild
        this.apiHttpService.post(this.modul, { title, text, typ }, false).subscribe({
          next: (erg: any) => {
            try {
              const normalized = this.normalizeNewsItem(erg);
              this.newsArray.push(normalized);
              this.newsDataSource.data = this.newsArray;
              this.resetFormNachAktion();
              this.uiMessageService.erstelleMessage('success', 'News erfolgreich gespeichert!');
            } catch (e: any) {
              this.uiMessageService.erstelleMessage('error', e);
            }
          },
          error: (error: any) => this.authSessionService.errorAnzeigen(error)
        });
      }
    } else {
      // UPDATE
      if (file) {
        const fd = new FormData();
        fd.append('title', title);
        fd.append('text', text);
        fd.append('typ', typ);
        fd.append('foto', file, file.name || 'upload.png');

        this.apiHttpService.patch(this.modul, idValue, fd, true).subscribe({
          next: (erg: any) => {
            try {
              const normalized = this.normalizeNewsItem(erg);
              this.newsArray = this.newsArray.map(n => (n.id === normalized.id ? normalized : n));
              this.newsDataSource.data = this.newsArray;
              this.resetFormNachAktion();
              this.uiMessageService.erstelleMessage('success', 'News erfolgreich geändert!');
            } catch (e: any) {
              this.uiMessageService.erstelleMessage('error', e);
            }
          },
          error: (error: any) => this.authSessionService.errorAnzeigen(error)
        });
      } else {
        // Nur Text/Titel ändern (JSON)
        this.apiHttpService.patch(this.modul, idValue, { title, text, typ }, false).subscribe({
          next: (erg: any) => {
            try {
              const normalized = this.normalizeNewsItem(erg);
              this.newsArray = this.newsArray.map(n => (n.id === normalized.id ? normalized : n));
              this.newsDataSource.data = this.newsArray;
              this.resetFormNachAktion();
              this.uiMessageService.erstelleMessage('success', 'News erfolgreich geändert!');
            } catch (e: any) {
              this.uiMessageService.erstelleMessage('error', e);
            }
          },
          error: (error: any) => this.authSessionService.errorAnzeigen(error)
        });
      }
    }
  }

  onFotoSelected(event: Event): void {
    const file = this.getSelectedFile();
    if (this.selectedPreviewUrl) {
      URL.revokeObjectURL(this.selectedPreviewUrl);
      this.selectedPreviewUrl = '';
    }

    if (!file) {
      this.fileFound = false;
      this.fileName = '';
      this.filePfad = '';
      this.imageModalOpen = false;
      return;
    }
    const sizeKB = Math.round(file.size / 1024);
    if (sizeKB >= this.apiHttpService.MaxUploadSize) {
      this.fileFound = false;
      this.fileName = '';
      const maxMB = this.apiHttpService.MaxUploadSize / 1024;
      this.uiMessageService.erstelleMessage('error', `Foto darf nicht größer als ${maxMB}MB sein!`);
      // Input leeren
      if (this.fotoRef?.nativeElement) this.fotoRef.nativeElement.value = '';
    } else {
      this.fileFound = true;
      this.fileName = file.name;
      this.selectedPreviewUrl = URL.createObjectURL(file);
      this.filePfad = this.selectedPreviewUrl;
    }
  }

  openModal(): void {
    if (!this.fileFound) {
      return;
    }
    this.focusBeforePhotoModal = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.imageModalOpen = true;
  }

  closeModal(): void {
    if (!this.imageModalOpen) {
      return;
    }
    this.imageModalOpen = false;
    setTimeout(() => {
      this.focusBeforePhotoModal?.focus();
      this.focusBeforePhotoModal = null;
    }, 0);
  }

  closeModalIfBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  newsfeedOeffnen(): void {
    window.open('https://blaulichtcloud.at/newsfeed', '_blank');
  }

  applyFilter(value: string): void {
    this.newsDataSource.filter = this.normalizeFilterValue(value);
    this.newsDataSource.paginator?.firstPage();
  }

  /** Nach Create/Update Formular, UI & File-Input zurücksetzen */
  private resetFormNachAktion(): void {
    this.formModul.reset({ id: '', template_id: '', template_name: '', title: '', text: '', typ: '', foto_url: '' });
    this.formModul.disable();
    this.isEditMode = false;
    this.btnUploadStatus = false;
    this.btnText = 'Bild auswählen';
    this.fileName = '';
    this.filePfad = '';
    this.fileFound = false;
    this.imageModalOpen = false;
    if (this.selectedPreviewUrl) {
      URL.revokeObjectURL(this.selectedPreviewUrl);
      this.selectedPreviewUrl = '';
    }
    this.setzeSelectZurueck();
    // Datei im Input löschen
    if (this.fotoRef?.nativeElement) {
      this.fotoRef.nativeElement.value = '';
    }
  }
}
