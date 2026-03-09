import { CommonModule } from "@angular/common";
import { Component, ElementRef, HostListener, OnInit, ViewChild, inject } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { RouterModule } from "@angular/router";

import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatDividerModule } from "@angular/material/divider";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";

import { IFahrzeugDetail, IFahrzeugList, IFahrzeugRaum, IRaumItem } from "../_interface/fahrzeug";
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
import { HeaderComponent } from "../_template/header/header.component";
import { DateInputMaskDirective } from '../_directive/date-input-mask.directive';

type RaumEditFG = FormGroup<{
  name: FormControl<string>;
  reihenfolge: FormControl<number>;
}>;

type ItemDraftFG = FormGroup<{
  name: FormControl<string>;
  menge: FormControl<number>;
  einheit: FormControl<string>;
  notiz: FormControl<string>;
  reihenfolge: FormControl<number>;
  wartung_zuletzt_am: FormControl<string>;
  wartung_naechstes_am: FormControl<string>;
}>;

@Component({
  standalone: true,
  selector: "app-fahrzeug",
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    ReactiveFormsModule,

    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatExpansionModule,
    MatDividerModule,
    DateInputMaskDirective,
  ],
  templateUrl: "./fahrzeug.component.html",
  styleUrl: "./fahrzeug.component.sass",
})
export class FahrzeugComponent implements OnInit {
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  private fb = inject(FormBuilder);

  breadcrumb: { label: string; url?: string }[] = [];
  modul = "fahrzeuge";

  fahrzeuge: IFahrzeugList[] = [];
  dataSource = new MatTableDataSource<IFahrzeugList>([]);
  sichtbareSpalten: string[] = ["name", "bezeichnung", "public_id", "actions"];
  editorOpen = false;
  inventarEditorOpen = false;
  inventarAnsicht: "detail" | "kompakt" = "detail";

  selectedId: string | null = null;
  selected: IFahrzeugDetail | null = null;

  fahrzeugForm = this.fb.group({
    id: this.fb.control<string | null>(null),
    name: this.fb.control<string>("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    bezeichnung: this.fb.control<string>("", { nonNullable: true }),
    beschreibung: this.fb.control<string>("", { nonNullable: true }),
    service_zuletzt_am: this.fb.control<string>("", { nonNullable: true }),
    service_naechstes_am: this.fb.control<string>("", { nonNullable: true }),
  });

  raumForm = this.fb.group({
    name: this.fb.control<string>("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    reihenfolge: this.fb.control<number>(0, { nonNullable: true }),
  });

  private itemCreateForms = new Map<string, ItemDraftFG>();
  private raumEditForms = new Map<string, RaumEditFG>();
  private itemEditForms = new Map<string, ItemDraftFG>();
  private raumFotoFiles = new Map<string, File>();
  private raumFotoNames = new Map<string, string>();

  fahrzeugFotoDatei: File | null = null;
  fahrzeugFotoName = "";

  neuerRaumFotoDatei: File | null = null;
  neuerRaumFotoName = "";

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild("fahrzeugFotoUpload") fahrzeugFotoRef?: ElementRef<HTMLInputElement>;
  @ViewChild("newRaumFotoUpload") neuerRaumFotoRef?: ElementRef<HTMLInputElement>;

  ngOnInit(): void {
    sessionStorage.setItem("PageNumber", "2");
    sessionStorage.setItem("Page2", "FZ");
    this.breadcrumb = this.navigationService.ladeBreadcrumb();
    this.updateVisibleColumns();
    this.loadList();
  }

  @HostListener("window:resize")
  onWindowResize(): void {
    this.updateVisibleColumns();
  }

  private updateVisibleColumns(): void {
    const width = typeof window !== "undefined" ? window.innerWidth : 1200;

    if (width < 576) {
      this.sichtbareSpalten = ["name", "actions"];
      return;
    }

    if (width < 992) {
      this.sichtbareSpalten = ["name", "bezeichnung", "actions"];
      return;
    }

    this.sichtbareSpalten = ["name", "bezeichnung", "public_id", "actions"];
  }

  private loadList(): void {
    this.apiHttpService.get(this.modul).subscribe({
      next: (res: unknown) => {
        this.fahrzeuge = (res as IFahrzeugList[]) ?? [];
        this.dataSource.data = this.fahrzeuge;

        queueMicrotask(() => {
          if (this.paginator) this.dataSource.paginator = this.paginator;
          if (this.sort) this.dataSource.sort = this.sort;
        });
      },
      error: (err: unknown) => this.authSessionService.errorAnzeigen(err),
    });
  }

  private resetNestedForms(): void {
    this.itemCreateForms.clear();
    this.raumEditForms.clear();
    this.itemEditForms.clear();
    this.raumFotoFiles.clear();
    this.raumFotoNames.clear();
  }

  private resetEditorData(): void {
    this.selectedId = null;
    this.selected = null;
    this.resetNestedForms();

    this.fahrzeugForm.reset({
      id: null,
      name: "",
      bezeichnung: "",
      beschreibung: "",
      service_zuletzt_am: "",
      service_naechstes_am: "",
    });

    this.raumForm.reset({
      name: "",
      reihenfolge: 0,
    });

    this.resetFahrzeugFotoAuswahl();
    this.resetNeuerRaumFotoAuswahl();
  }

  editFahrzeug(row: IFahrzeugList): void {
    this.editorOpen = true;
    this.inventarEditorOpen = false;
    this.selectedId = row.id;
    this.loadDetail(row.id);
  }

  closeEditor(): void {
    this.editorOpen = false;
    this.inventarEditorOpen = false;
    this.resetEditorData();
  }

  private loadDetail(id: string): void {
    this.apiHttpService.get(`${this.modul}/${id}`).subscribe({
      next: (res: unknown) => {
        this.selected = res as IFahrzeugDetail;

        this.fahrzeugForm.setValue({
          id: this.selected.id,
          name: this.selected.name ?? "",
          bezeichnung: this.selected.bezeichnung ?? "",
          beschreibung: this.selected.beschreibung ?? "",
          service_zuletzt_am: this.toDateInput(this.selected.service_zuletzt_am),
          service_naechstes_am: this.toDateInput(this.selected.service_naechstes_am),
        });

        this.resetNestedForms();
        for (const raum of this.selected.raeume ?? []) {
          this.itemCreateForms.set(raum.id, this.createItemDraftForm());
        }

        this.resetFahrzeugFotoAuswahl();
      },
      error: (err: unknown) => this.authSessionService.errorAnzeigen(err),
    });
  }

  newFahrzeug(): void {
    this.editorOpen = true;
    this.inventarEditorOpen = false;
    this.resetEditorData();
  }

  openInventarFromList(row: IFahrzeugList): void {
    this.openInventarEditor(row.id);
  }

  openInventarFromEditor(): void {
    if (!this.selectedId) {
      this.uiMessageService.erstelleMessage("error", "Bitte Fahrzeug zuerst speichern.");
      return;
    }

    this.openInventarEditor(this.selectedId);
  }

  backToFahrzeugEditor(): void {
    if (!this.selectedId) {
      this.uiMessageService.erstelleMessage("error", "Bitte Fahrzeug zuerst auswählen.");
      return;
    }

    this.inventarEditorOpen = false;
    this.editorOpen = true;

    if (!this.selected || this.selected.id !== this.selectedId) {
      this.loadDetail(this.selectedId);
    }
  }

  toggleInventarAnsicht(): void {
    this.inventarAnsicht = this.inventarAnsicht === "detail" ? "kompakt" : "detail";
  }

  private openInventarEditor(fahrzeugId: string): void {
    this.selectedId = fahrzeugId;
    this.editorOpen = false;
    this.inventarEditorOpen = true;
    this.loadDetail(fahrzeugId);
  }

  countItems(raeume: IFahrzeugRaum[] | null | undefined): number {
    return (raeume ?? []).reduce((sum, raum) => sum + (raum.items?.length ?? 0), 0);
  }

  private normalizeDate(dateValue: string | null | undefined): string | null {
    const clean = String(dateValue ?? "").trim();
    return clean === "" ? null : clean;
  }

  private toDateInput(dateValue: string | null | undefined): string {
    if (!dateValue) return "";
    return String(dateValue).slice(0, 10);
  }

  private isDateWindowInvalid(zuletzt: string | null, naechstes: string | null): boolean {
    return Boolean(zuletzt && naechstes && naechstes < zuletzt);
  }

  private buildFahrzeugPayload(): {
    name: string;
    bezeichnung: string;
    beschreibung: string;
    service_zuletzt_am: string | null;
    service_naechstes_am: string | null;
  } | null {
    const serviceZuletzt = this.normalizeDate(this.fahrzeugForm.controls.service_zuletzt_am.value);
    const serviceNaechstes = this.normalizeDate(this.fahrzeugForm.controls.service_naechstes_am.value);

    if (this.isDateWindowInvalid(serviceZuletzt, serviceNaechstes)) {
      this.uiMessageService.erstelleMessage(
        "error",
        "Service: Das nächste Datum darf nicht vor dem zuletzt erledigten Datum liegen."
      );
      return null;
    }

    return {
      name: this.fahrzeugForm.controls.name.value.trim(),
      bezeichnung: this.fahrzeugForm.controls.bezeichnung.value.trim(),
      beschreibung: this.fahrzeugForm.controls.beschreibung.value.trim(),
      service_zuletzt_am: serviceZuletzt,
      service_naechstes_am: serviceNaechstes,
    };
  }

  private toFahrzeugFormData(payload: {
    name: string;
    bezeichnung: string;
    beschreibung: string;
    service_zuletzt_am: string | null;
    service_naechstes_am: string | null;
  }, file: File): FormData {
    const fd = new FormData();
    fd.append("name", payload.name);
    fd.append("bezeichnung", payload.bezeichnung);
    fd.append("beschreibung", payload.beschreibung);
    fd.append("service_zuletzt_am", payload.service_zuletzt_am ?? "");
    fd.append("service_naechstes_am", payload.service_naechstes_am ?? "");
    fd.append("foto", file, file.name || "upload.png");
    return fd;
  }

  private isUploadTooLarge(file: File): boolean {
    const sizeKB = Math.round(file.size / 1024);
    return sizeKB >= this.apiHttpService.MaxUploadSize;
  }

  private showUploadTooLargeError(): void {
    const maxMB = this.apiHttpService.MaxUploadSize / 1024;
    this.uiMessageService.erstelleMessage("error", `Foto darf nicht größer als ${maxMB}MB sein!`);
  }

  private resetFahrzeugFotoAuswahl(): void {
    this.fahrzeugFotoDatei = null;
    this.fahrzeugFotoName = "";
    if (this.fahrzeugFotoRef?.nativeElement) {
      this.fahrzeugFotoRef.nativeElement.value = "";
    }
  }

  private resetNeuerRaumFotoAuswahl(): void {
    this.neuerRaumFotoDatei = null;
    this.neuerRaumFotoName = "";
    if (this.neuerRaumFotoRef?.nativeElement) {
      this.neuerRaumFotoRef.nativeElement.value = "";
    }
  }

  onFahrzeugFotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;

    if (!file) {
      this.resetFahrzeugFotoAuswahl();
      return;
    }

    if (this.isUploadTooLarge(file)) {
      this.resetFahrzeugFotoAuswahl();
      this.showUploadTooLargeError();
      return;
    }

    this.fahrzeugFotoDatei = file;
    this.fahrzeugFotoName = file.name;
  }

  removeFahrzeugFoto(): void {
    if (!this.selectedId) return;

    this.apiHttpService.patch(this.modul, this.selectedId, { remove_foto: true }, false).subscribe({
      next: () => {
        this.uiMessageService.erstelleMessage("success", "Fahrzeugfoto entfernt.");
        this.resetFahrzeugFotoAuswahl();
        this.loadList();
        this.loadDetail(this.selectedId!);
      },
      error: (err: unknown) => this.authSessionService.errorAnzeigen(err),
    });
  }

  saveFahrzeug(): void {
    if (this.fahrzeugForm.invalid) {
      this.uiMessageService.erstelleMessage("error", "Bitte Name ausfüllen.");
      return;
    }

    const payload = this.buildFahrzeugPayload();
    if (!payload) return;

    const id = this.fahrzeugForm.controls.id.value;

    if (!id) {
      if (this.fahrzeugFotoDatei) {
        const fd = this.toFahrzeugFormData(payload, this.fahrzeugFotoDatei);
        this.apiHttpService.post(this.modul, fd, true).subscribe({
          next: () => {
            this.uiMessageService.erstelleMessage("success", "Fahrzeug erstellt.");
            this.closeEditor();
            this.loadList();
          },
          error: (err: unknown) => this.authSessionService.errorAnzeigen(err),
        });
      } else {
        this.apiHttpService.post(this.modul, payload, false).subscribe({
          next: () => {
            this.uiMessageService.erstelleMessage("success", "Fahrzeug erstellt.");
            this.closeEditor();
            this.loadList();
          },
          error: (err: unknown) => this.authSessionService.errorAnzeigen(err),
        });
      }
      return;
    }

    if (this.fahrzeugFotoDatei) {
      const fd = this.toFahrzeugFormData(payload, this.fahrzeugFotoDatei);
      this.apiHttpService.patch(this.modul, id, fd, true).subscribe({
        next: () => {
          this.uiMessageService.erstelleMessage("success", "Fahrzeug gespeichert.");
          this.closeEditor();
          this.loadList();
        },
        error: (err: unknown) => this.authSessionService.errorAnzeigen(err),
      });
    } else {
      this.apiHttpService.patch(this.modul, id, payload, false).subscribe({
        next: () => {
          this.uiMessageService.erstelleMessage("success", "Fahrzeug gespeichert.");
          this.closeEditor();
          this.loadList();
        },
        error: (err: unknown) => this.authSessionService.errorAnzeigen(err),
      });
    }
  }

  deleteSelectedFahrzeug(): void {
    if (!this.selectedId) return;

    const name = this.selected?.name || this.fahrzeugForm.controls.name.value || "Unbenannt";
    if (!confirm(`Fahrzeug "${name}" wirklich löschen?`)) return;

    this.apiHttpService.delete(this.modul, this.selectedId).subscribe({
      next: () => {
        this.uiMessageService.erstelleMessage("success", "Fahrzeug gelöscht.");
        this.closeEditor();
        this.loadList();
      },
      error: (err: unknown) => this.authSessionService.errorAnzeigen(err),
    });
  }

  // =========================
  // Räume (nested)
  // =========================
  onNewRaumFotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;

    if (!file) {
      this.resetNeuerRaumFotoAuswahl();
      return;
    }

    if (this.isUploadTooLarge(file)) {
      this.resetNeuerRaumFotoAuswahl();
      this.showUploadTooLargeError();
      return;
    }

    this.neuerRaumFotoDatei = file;
    this.neuerRaumFotoName = file.name;
  }

  addRaum(): void {
    if (!this.selectedId) {
      this.uiMessageService.erstelleMessage("error", "Bitte zuerst ein Fahrzeug auswählen.");
      return;
    }
    if (this.raumForm.invalid) {
      this.uiMessageService.erstelleMessage("error", "Raumname fehlt.");
      return;
    }

    const payload = {
      name: this.raumForm.controls.name.value.trim(),
      reihenfolge: this.raumForm.controls.reihenfolge.value,
    };

    if (this.neuerRaumFotoDatei) {
      const fd = new FormData();
      fd.append("name", payload.name);
      fd.append("reihenfolge", String(payload.reihenfolge));
      fd.append("foto", this.neuerRaumFotoDatei, this.neuerRaumFotoDatei.name || "upload.png");

      this.apiHttpService.post(`fahrzeuge/${this.selectedId}/raeume`, fd, true).subscribe({
        next: () => {
          this.uiMessageService.erstelleMessage("success", "Raum angelegt.");
          this.raumForm.reset({ name: "", reihenfolge: 0 });
          this.resetNeuerRaumFotoAuswahl();
          this.loadDetail(this.selectedId!);
        },
        error: (err: unknown) => this.authSessionService.errorAnzeigen(err),
      });
      return;
    }

    this.apiHttpService.post(`fahrzeuge/${this.selectedId}/raeume`, payload, false).subscribe({
      next: () => {
        this.uiMessageService.erstelleMessage("success", "Raum angelegt.");
        this.raumForm.reset({ name: "", reihenfolge: 0 });
        this.resetNeuerRaumFotoAuswahl();
        this.loadDetail(this.selectedId!);
      },
      error: (err: unknown) => this.authSessionService.errorAnzeigen(err),
    });
  }

  private createRaumEditForm(raum: IFahrzeugRaum): RaumEditFG {
    return this.fb.group({
      name: this.fb.control<string>(raum.name ?? "", {
        nonNullable: true,
        validators: [Validators.required],
      }),
      reihenfolge: this.fb.control<number>(raum.reihenfolge ?? 0, { nonNullable: true }),
    });
  }

  raumEditFormFor(raum: IFahrzeugRaum): RaumEditFG {
    const existing = this.raumEditForms.get(raum.id);
    if (existing) return existing;

    const created = this.createRaumEditForm(raum);
    this.raumEditForms.set(raum.id, created);
    return created;
  }

  onRaumFotoSelected(raumId: string, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;

    if (!file) {
      this.raumFotoFiles.delete(raumId);
      this.raumFotoNames.delete(raumId);
      return;
    }

    if (this.isUploadTooLarge(file)) {
      this.raumFotoFiles.delete(raumId);
      this.raumFotoNames.delete(raumId);
      this.showUploadTooLargeError();
      if (input) input.value = "";
      return;
    }

    this.raumFotoFiles.set(raumId, file);
    this.raumFotoNames.set(raumId, file.name);
  }

  raumFotoNameFor(raumId: string): string {
    return this.raumFotoNames.get(raumId) ?? "";
  }

  saveRaum(raum: IFahrzeugRaum): void {
    if (!this.selectedId) return;

    const form = this.raumEditFormFor(raum);
    form.markAllAsTouched();
    if (form.invalid) {
      this.uiMessageService.erstelleMessage("error", "Bitte Raumname ausfüllen.");
      return;
    }

    const payload = {
      name: form.controls.name.value.trim(),
      reihenfolge: form.controls.reihenfolge.value,
    };

    const file = this.raumFotoFiles.get(raum.id) ?? null;

    if (file) {
      const fd = new FormData();
      fd.append("name", payload.name);
      fd.append("reihenfolge", String(payload.reihenfolge));
      fd.append("foto", file, file.name || "upload.png");

      this.apiHttpService.patch(`fahrzeuge/${this.selectedId}/raeume`, raum.id, fd, true).subscribe({
        next: () => {
          this.uiMessageService.erstelleMessage("success", `Raum "${raum.name}" gespeichert.`);
          this.raumFotoFiles.delete(raum.id);
          this.raumFotoNames.delete(raum.id);
          this.loadDetail(this.selectedId!);
        },
        error: (err: unknown) => this.authSessionService.errorAnzeigen(err),
      });
      return;
    }

    this.apiHttpService.patch(`fahrzeuge/${this.selectedId}/raeume`, raum.id, payload, false).subscribe({
      next: () => {
        this.uiMessageService.erstelleMessage("success", `Raum "${raum.name}" gespeichert.`);
        this.loadDetail(this.selectedId!);
      },
      error: (err: unknown) => this.authSessionService.errorAnzeigen(err),
    });
  }

  removeRaumFoto(raum: IFahrzeugRaum): void {
    if (!this.selectedId) return;

    this.apiHttpService.patch(`fahrzeuge/${this.selectedId}/raeume`, raum.id, { remove_foto: true }, false).subscribe({
      next: () => {
        this.uiMessageService.erstelleMessage("success", `Raumfoto von "${raum.name}" entfernt.`);
        this.raumFotoFiles.delete(raum.id);
        this.raumFotoNames.delete(raum.id);
        this.loadDetail(this.selectedId!);
      },
      error: (err: unknown) => this.authSessionService.errorAnzeigen(err),
    });
  }

  deleteRaum(raum: IFahrzeugRaum): void {
    if (!this.selectedId) return;
    if (!confirm(`Raum "${raum.name}" wirklich löschen? (Items werden mitgelöscht)`)) return;

    this.apiHttpService.delete(`fahrzeuge/${this.selectedId}/raeume`, raum.id).subscribe({
      next: () => {
        this.uiMessageService.erstelleMessage("success", "Raum gelöscht.");
        this.loadDetail(this.selectedId!);
      },
      error: (err: unknown) => this.authSessionService.errorAnzeigen(err),
    });
  }

  // =========================
  // Items (nested)
  // =========================
  private createItemDraftForm(seed?: Partial<IRaumItem>): ItemDraftFG {
    const mengeRaw = Number(seed?.menge ?? 1);
    const menge = Number.isFinite(mengeRaw) && mengeRaw >= 0 ? mengeRaw : 1;

    return this.fb.group({
      name: this.fb.control<string>(seed?.name ?? "", {
        nonNullable: true,
        validators: [Validators.required],
      }),
      menge: this.fb.control<number>(menge, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0)],
      }),
      einheit: this.fb.control<string>(seed?.einheit ?? "", { nonNullable: true }),
      notiz: this.fb.control<string>(seed?.notiz ?? "", { nonNullable: true }),
      reihenfolge: this.fb.control<number>(seed?.reihenfolge ?? 0, { nonNullable: true }),
      wartung_zuletzt_am: this.fb.control<string>(this.toDateInput(seed?.wartung_zuletzt_am), {
        nonNullable: true,
      }),
      wartung_naechstes_am: this.fb.control<string>(this.toDateInput(seed?.wartung_naechstes_am), {
        nonNullable: true,
      }),
    });
  }

  itemCreateFormFor(raumId: string): ItemDraftFG {
    const f = this.itemCreateForms.get(raumId);
    if (f) return f;

    const created = this.createItemDraftForm();
    this.itemCreateForms.set(raumId, created);
    return created;
  }

  itemEditFormFor(item: IRaumItem): ItemDraftFG {
    const f = this.itemEditForms.get(item.id);
    if (f) return f;

    const created = this.createItemDraftForm(item);
    this.itemEditForms.set(item.id, created);
    return created;
  }

  private buildItemPayload(form: ItemDraftFG): {
    name: string;
    menge: number;
    einheit: string;
    notiz: string;
    reihenfolge: number;
    wartung_zuletzt_am: string | null;
    wartung_naechstes_am: string | null;
  } | null {
    const wartungZuletzt = this.normalizeDate(form.controls.wartung_zuletzt_am.value);
    const wartungNaechstes = this.normalizeDate(form.controls.wartung_naechstes_am.value);

    if (this.isDateWindowInvalid(wartungZuletzt, wartungNaechstes)) {
      this.uiMessageService.erstelleMessage(
        "error",
        "Wartung: Das nächste Datum darf nicht vor dem zuletzt erledigten Datum liegen."
      );
      return null;
    }

    return {
      name: form.controls.name.value.trim(),
      menge: form.controls.menge.value,
      einheit: form.controls.einheit.value.trim(),
      notiz: form.controls.notiz.value.trim(),
      reihenfolge: form.controls.reihenfolge.value,
      wartung_zuletzt_am: wartungZuletzt,
      wartung_naechstes_am: wartungNaechstes,
    };
  }

  addItem(raum: IFahrzeugRaum): void {
    const form = this.itemCreateFormFor(raum.id);
    form.markAllAsTouched();

    if (form.invalid) {
      this.uiMessageService.erstelleMessage("error", "Item-Name fehlt oder Menge ist ungültig.");
      return;
    }

    const payload = this.buildItemPayload(form);
    if (!payload) return;

    this.apiHttpService.post(`raeume/${raum.id}/items`, payload, false).subscribe({
      next: () => {
        this.uiMessageService.erstelleMessage("success", "Item angelegt.");
        form.reset({
          name: "",
          menge: 1,
          einheit: "",
          notiz: "",
          reihenfolge: 0,
          wartung_zuletzt_am: "",
          wartung_naechstes_am: "",
        });
        if (this.selectedId) this.loadDetail(this.selectedId);
      },
      error: (err: unknown) => this.authSessionService.errorAnzeigen(err),
    });
  }

  saveItem(raum: IFahrzeugRaum, item: IRaumItem): void {
    const form = this.itemEditFormFor(item);
    form.markAllAsTouched();

    if (form.invalid) {
      this.uiMessageService.erstelleMessage("error", "Item-Name fehlt oder Menge ist ungültig.");
      return;
    }

    const payload = this.buildItemPayload(form);
    if (!payload) return;

    this.apiHttpService.patch(`raeume/${raum.id}/items`, item.id, payload, false).subscribe({
      next: () => {
        this.uiMessageService.erstelleMessage("success", `Item "${item.name}" gespeichert.`);
        if (this.selectedId) this.loadDetail(this.selectedId);
      },
      error: (err: unknown) => this.authSessionService.errorAnzeigen(err),
    });
  }

  deleteItem(raum: IFahrzeugRaum, item: IRaumItem): void {
    if (!confirm(`Item "${item.name}" wirklich löschen?`)) return;

    this.apiHttpService.delete(`raeume/${raum.id}/items`, item.id).subscribe({
      next: () => {
        this.uiMessageService.erstelleMessage("success", "Item gelöscht.");
        if (this.selectedId) this.loadDetail(this.selectedId);
      },
      error: (err: unknown) => this.authSessionService.errorAnzeigen(err),
    });
  }
}
