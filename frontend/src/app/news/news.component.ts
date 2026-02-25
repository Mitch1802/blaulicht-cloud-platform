import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { INews } from 'src/app/_interface/news';
import { GlobalDataService } from 'src/app/_service/global-data.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { NgStyle } from '@angular/common';
import { MatOption } from '@angular/material/core';
import { MatButton } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Router } from '@angular/router';
import { HeaderComponent } from '../_template/header/header.component';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-news',
  imports: [
    HeaderComponent,
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
    NgStyle,
    MatAutocompleteModule
  ],
  templateUrl: './news.component.html',
  styleUrl: './news.component.sass'
})
export class NewsComponent implements OnInit {
  @ViewChild('fotoUpload', { static: false }) fotoRef!: ElementRef<HTMLInputElement>;

  globalDataService = inject(GlobalDataService);
  router = inject(Router);

  title = 'News Verwaltung';
  modul = 'news/intern';
  breadcrumb: any[] = [];

  newsArray: INews[] = [];
  btnText = 'Bild auswählen';
  fileName = '';
  filePfad = '';
  fileFound = false;
  btnUploadStatus = false;
  private selectedPreviewUrl = '';

  formAuswahl = new FormGroup({
    news: new FormControl<number | ''>('')
  });

  formModul = new FormGroup({
    id: new FormControl<string | ''>(''),
    title: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    text: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    typ: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    // nur für Anzeige/Modal – NICHT ans Backend senden
    foto_url: new FormControl<string>(''),
  });

  ngOnInit(): void {
    sessionStorage.setItem('PageNumber', '2');
    sessionStorage.setItem('Page2', 'NEWS');
    this.breadcrumb = this.globalDataService.ladeBreadcrumb();

    this.formModul.disable();

    this.globalDataService.get(this.modul).subscribe({
      next: (erg: any) => {
        try {
          this.newsArray = this.convertNewsDate(erg) as INews[];
        } catch (e: any) {
          this.globalDataService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      }
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
    this.globalDataService.delete(this.modul, id).subscribe({
      next: (erg: any) => {
        try {
          this.newsArray = this.newsArray.filter(n => n.id !== id);
          this.resetFormNachAktion();
          this.globalDataService.erstelleMessage('success', 'News erfolgreich gelöscht!');
        } catch (e: any) {
          this.globalDataService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => this.globalDataService.errorAnzeigen(error)
    });
  }

  auswahlBearbeiten(element: any): void {
    if (element.id === 0) {
      return;
    }
    const abfrageUrl = `${this.modul}/${element.id}`;
    this.globalDataService.get(abfrageUrl).subscribe({
      next: (erg: any) => {
        try {
          let details: INews = erg;
          this.formModul.enable();
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
            title: details.title,
            text: details.text,
            typ: details.typ,
            foto_url: ''
          });
          this.setzeSelectZurueck();
        } catch (e: any) {
          this.globalDataService.erstelleMessage('error', e);
        }
      },
      error: (error: any) => this.globalDataService.errorAnzeigen(error)
    });
  }

  abbrechen(): void {
    this.globalDataService.erstelleMessage('info', 'News nicht gespeichert!');
    this.router.navigate(['/news']);
  }

  neueDetails(): void {
    this.formModul.enable();
    this.btnUploadStatus = true;
    this.btnText = 'Bild auswählen';
    this.fileName = '';
    this.filePfad = '';
    this.fileFound = false;
    this.formModul.patchValue({ id: '', title: '', text: '', typ: 'intern', foto_url: '' });
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

        this.globalDataService.post(this.modul, fd, true).subscribe({
          next: (erg: any) => {
            try {
              this.newsArray.push(erg);
              this.resetFormNachAktion();
              this.globalDataService.erstelleMessage('success', 'News erfolgreich gespeichert!');
            } catch (e: any) {
              this.globalDataService.erstelleMessage('error', e);
            }
          },
          error: (error: any) => this.globalDataService.errorAnzeigen(error)
        });
      } else {
        // JSON ohne Bild
        this.globalDataService.post(this.modul, { title, text, typ }, false).subscribe({
          next: (erg: any) => {
            try {
              this.newsArray.push(erg);
              this.resetFormNachAktion();
              this.globalDataService.erstelleMessage('success', 'News erfolgreich gespeichert!');
            } catch (e: any) {
              this.globalDataService.erstelleMessage('error', e);
            }
          },
          error: (error: any) => this.globalDataService.errorAnzeigen(error)
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

        this.globalDataService.patch(this.modul, idValue, fd, true).subscribe({
          next: (erg: any) => {
            try {
              this.newsArray = this.newsArray.map(n => (n.id === erg.id ? erg : n));
              this.resetFormNachAktion();
              this.globalDataService.erstelleMessage('success', 'News erfolgreich geändert!');
            } catch (e: any) {
              this.globalDataService.erstelleMessage('error', e);
            }
          },
          error: (error: any) => this.globalDataService.errorAnzeigen(error)
        });
      } else {
        // Nur Text/Titel ändern (JSON)
        this.globalDataService.patch(this.modul, idValue, { title, text, typ }, false).subscribe({
          next: (erg: any) => {
            try {
              this.newsArray = this.newsArray.map(n => (n.id === erg.id ? erg : n));
              this.resetFormNachAktion();
              this.globalDataService.erstelleMessage('success', 'News erfolgreich geändert!');
            } catch (e: any) {
              this.globalDataService.erstelleMessage('error', e);
            }
          },
          error: (error: any) => this.globalDataService.errorAnzeigen(error)
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
      return;
    }
    const sizeKB = Math.round(file.size / 1024);
    if (sizeKB >= this.globalDataService.MaxUploadSize) {
      this.fileFound = false;
      this.fileName = '';
      const maxMB = this.globalDataService.MaxUploadSize / 1024;
      this.globalDataService.erstelleMessage('error', `Foto darf nicht größer als ${maxMB}MB sein!`);
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
    const modal: any = document.getElementById('myModal');
    if (modal) modal.style.display = 'block';
  }

  closeModal(): void {
    const modal: any = document.getElementById('myModal');
    if (modal) modal.style.display = 'none';
  }

  newsfeedOeffnen(): void {
    window.open('https://blaulichtcloud.at/newsfeed', '_blank');
  }

  /** Nach Create/Update Formular, UI & File-Input zurücksetzen */
  private resetFormNachAktion(): void {
    this.formModul.reset({ id: '', title: '', text: '', typ: '', foto_url: '' });
    this.formModul.disable();
    this.btnUploadStatus = false;
    this.btnText = 'Bild auswählen';
    this.fileName = '';
    this.filePfad = '';
    this.fileFound = false;
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
