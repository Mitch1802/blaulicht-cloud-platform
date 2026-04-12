import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ThemePalette } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';

let nextUploadFieldId = 0;

@Component({
  selector: 'imr-upload-field',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './imr-upload-field.component.html',
  styleUrl: './imr-upload-field.component.sass',
})
export class ImrUploadFieldComponent {
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  @Input() label = '';
  @Input() inputId = '';
  @Input() accept = '';
  @Input() buttonText = 'Datei auswählen';
  @Input() fileName = '';
  @Input() color: ThemePalette = 'primary';
  @Input() multiple = false;

  @Output() fileChange = new EventEmitter<Event>();

  readonly fallbackInputId = `imr-upload-field-${nextUploadFieldId++}`;

  get resolvedInputId(): string {
    return this.inputId || this.fallbackInputId;
  }

  get selectedFile(): File | null {
    return this.fileInput?.nativeElement.files?.[0] ?? null;
  }

  clear(): void {
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  openPicker(): void {
    this.fileInput?.nativeElement.click();
  }
}