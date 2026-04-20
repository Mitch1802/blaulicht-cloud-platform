import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";

import { MatButtonModule } from "@angular/material/button";
import { MatDividerModule } from "@angular/material/divider";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatSelectModule } from "@angular/material/select";

import {
  ImrBreadcrumbItem,
  ImrPageLayoutComponent,
  ImrSectionComponent,
} from "../imr-ui-library";
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
import { IFahrzeugPublic, IFahrzeugPublicList } from "../_interface/fahrzeug";
import { CheckStatus, CHECK_STATUS_OPTIONS } from "./fahrzeug.constants";

@Component({
  standalone: true,
  selector: "app-public-fahrzeug",
  imports: [
    ImrPageLayoutComponent,
    ImrSectionComponent,
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  templateUrl: "./public-fahrzeug.component.html",
  styleUrl: "./public-fahrzeug.component.sass",
})
export class PublicFahrzeugComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  private fb = inject(FormBuilder);

  breadcrumb: ImrBreadcrumbItem[] = [];

  publicId = "";
  token: string | null = null;
  selectedPublicId = "";

  loading = false;
  verified = false;

  fahrzeugOptionen: IFahrzeugPublicList[] = [];
  fahrzeug: IFahrzeugPublic | null = null;

  statusOptions = CHECK_STATUS_OPTIONS;

  // local-only draft (wird NICHT gespeichert)
  draft: Record<
    string,
    { status: CheckStatus; menge_aktuel?: number | null; notiz?: string }
  > = {};

  pinForm = this.fb.group({
    pin: this.fb.control<string>("", {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4)],
    }),
  });

  auswahlForm = this.fb.group({
    public_id: this.fb.control<string>("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  ngOnInit(): void {
    // Breadcrumb, wenn du willst:
    // sessionStorage.setItem("PageNumber", "2");
    // sessionStorage.setItem("Page2", "FZ");
    this.breadcrumb = this.navigationService.ladeBreadcrumb();

    this.publicId = String(this.route.snapshot.paramMap.get("publicId") ?? "").trim();
    this.selectedPublicId = this.publicId;

    this.token = sessionStorage.getItem(this.tokenKey());
    if (this.token) {
      this.verified = true;
      this.loadAfterVerify();
    }
  }

  private tokenKey(): string {
    // globaler PIN => token gilt für alle Fahrzeuge
    return `public_token_global`;
  }

  verifyPin(): void {
    this.pinForm.markAllAsTouched();
    if (this.pinForm.invalid) return;

    const pin = this.pinForm.controls.pin.value.trim();
    this.loading = true;

    this.apiHttpService.post<{ access_token?: string }>(`public/pin/verify`, { pin }).subscribe({
      next: (res) => {
        const access = String(res?.access_token ?? "");
        if (!access) {
          this.uiMessageService.erstelleMessage("error", "Kein Token erhalten.");
          return;
        }

        sessionStorage.setItem(this.tokenKey(), access);
        this.token = access;
        this.verified = true;
        this.pinForm.reset({ pin: "" });

        this.loadAfterVerify();
      },
      error: (err: unknown) => this.authSessionService.errorAnzeigen(err),
    }).add(() => {
      this.loading = false;
    });
  }

  logoutPublic(): void {
    sessionStorage.removeItem(this.tokenKey());
    this.token = null;
    this.verified = false;
    this.fahrzeugOptionen = [];
    this.selectedPublicId = this.publicId;
    this.auswahlForm.reset({ public_id: "" });
    this.fahrzeug = null;
    this.draft = {};
  }

  openSelectedFahrzeug(): void {
    this.auswahlForm.markAllAsTouched();
    if (this.auswahlForm.invalid) return;

    const selectedId = this.auswahlForm.controls.public_id.value.trim();
    if (!selectedId) return;

    this.selectedPublicId = selectedId;
    this.loadPublicDetail(selectedId);
  }

  backToSelection(): void {
    this.fahrzeug = null;
    this.draft = {};
    this.selectedPublicId = "";
    this.auswahlForm.patchValue({ public_id: "" });
  }

  private loadAfterVerify(): void {
    if (!this.token) return;

    if (this.selectedPublicId) {
      this.loadPublicDetail(this.selectedPublicId);
      return;
    }

    this.loadPublicFahrzeuge();
  }

  private loadPublicFahrzeuge(): void {
    if (!this.token) return;

    this.loading = true;
    this.apiHttpService.getWithBearer<IFahrzeugPublicList[]>("public/fahrzeuge", this.token).subscribe({
      next: (res) => {
        const optionen = res ?? [];
        this.fahrzeugOptionen = optionen;
      },
      error: (err: unknown) => this.authSessionService.errorAnzeigen(err),
    }).add(() => {
      this.loading = false;
    });
  }

  private loadPublicDetail(publicId: string): void {
    if (!this.token) return;

    this.loading = true;

    // Header Bearer via ApiHttpService.getWithBearer()
    this.apiHttpService.getWithBearer<IFahrzeugPublic>(`public/fahrzeuge/${publicId}`, this.token).subscribe({
      next: (res) => {
        this.fahrzeug = res;
        this.initDraft();
      },
      error: (err: unknown) => this.authSessionService.errorAnzeigen(err),
    }).add(() => {
      this.loading = false;
    });
  }

  private initDraft(): void {
    this.draft = {};
    for (const raum of this.fahrzeug?.raeume ?? []) {
      for (const item of raum.items ?? []) {
        const key = this.keyFor(raum.name, item.reihenfolge, item.name);
        this.draft[key] = { status: "ok" };
      }
    }
  }

  private keyFor(raumName: string, reihenfolge: number, itemName: string): string {
    return `${(raumName ?? "").trim()}::${reihenfolge ?? 0}::${(itemName ?? "").trim()}`.toLowerCase();
  }

  getKey(raumName: string, item: { reihenfolge: number; name: string }): string {
    return this.keyFor(raumName, item.reihenfolge, item.name);
  }

  setStatus(raumName: string, item: { reihenfolge: number; name: string }, status: CheckStatus): void {
    const key = this.getKey(raumName, item);
    this.draft[key] ??= { status: "ok" };
    this.draft[key].status = status;
  }

  setIst(raumName: string, item: { reihenfolge: number; name: string }, value: unknown): void {
    const key = this.getKey(raumName, item);
    this.draft[key] ??= { status: "ok" };

    const num = value === "" || value === null || value === undefined ? null : Number(value);
    this.draft[key].menge_aktuel = Number.isFinite(num as number) ? (num as number) : null;
  }

  setNotiz(raumName: string, item: { reihenfolge: number; name: string }, value: unknown): void {
    const key = this.getKey(raumName, item);
    this.draft[key] ??= { status: "ok" };
    this.draft[key].notiz = String(value ?? "");
  }
}

