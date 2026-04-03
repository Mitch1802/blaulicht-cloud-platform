import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";

import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from '@angular/material/form-field';

import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
import { IFahrzeugDetail } from "../_interface/fahrzeug";
import { IMR_UI_COMPONENTS, ImrBreadcrumbItem } from "../imr-ui-library";

type ResultFG = FormGroup<{
  item_id: FormControl<string>;
  checked: FormControl<boolean>;
  menge_soll: FormControl<number | null>;
  notiz: FormControl<string>;
}>;

type CheckForm = FormGroup<{
  title: FormControl<string>;
  notiz: FormControl<string>;
  results: FormArray<ResultFG>;
}>;

type CheckRoomView = {
  name: string;
  items: Array<{
    index: number;
    name: string;
    menge: number;
    einheit: string;
  }>;
};

@Component({
  standalone: true,
  selector: "app-fahrzeug-check",
  imports: [
    ...IMR_UI_COMPONENTS,
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: "./fahrzeug-check.component.html",
  styleUrl: "./fahrzeug-check.component.sass",
})
export class FahrzeugCheckComponent implements OnInit {
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  breadcrumb: ImrBreadcrumbItem[] = [];

  fahrzeugId = "";
  fahrzeug: IFahrzeugDetail | null = null;
  raeumeView: CheckRoomView[] = [];

  form: CheckForm = this.fb.group({
    title: this.fb.control("", { nonNullable: true }),
    notiz: this.fb.control("", { nonNullable: true }),
    results: this.fb.array<ResultFG>([]),
  });

  ngOnInit(): void {
    this.breadcrumb = this.navigationService.ladeBreadcrumb();
    this.fahrzeugId = String(this.route.snapshot.paramMap.get("id") ?? "");
    if (!this.fahrzeugId) return;

    this.load();
  }

  private load(): void {
    this.apiHttpService.get<IFahrzeugDetail>(`fahrzeuge/${this.fahrzeugId}`).subscribe({
      next: (fz) => {
        this.fahrzeug = fz;
        this.buildForm();
      },
      error: (e) => this.authSessionService.errorAnzeigen(e),
    });
  }

  private makeResultFG(itemId: string, mengeSoll: number): ResultFG {
    return this.fb.group({
      item_id: this.fb.control(itemId, { nonNullable: true, validators: [Validators.required] }),
      checked: this.fb.control(false, { nonNullable: true }),
      menge_soll: this.fb.control<number | null>(mengeSoll ?? null),
      notiz: this.fb.control("", { nonNullable: true }),
    });
  }

  private buildForm(): void {
    const arr = this.form.controls.results;
    arr.clear();
    this.raeumeView = [];

    const fz = this.fahrzeug;
    if (!fz) return;

    for (const raum of fz.raeume ?? []) {
      const roomView: CheckRoomView = {
        name: raum.name,
        items: [],
      };

      for (const item of raum.items ?? []) {
        const idx = arr.length;
        arr.push(this.makeResultFG(String(item.id), Number(item.menge)));
        roomView.items.push({
          index: idx,
          name: item.name,
          menge: Number(item.menge),
          einheit: item.einheit,
        });
      }

      this.raeumeView.push(roomView);
    }
  }

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.uiMessageService.erstelleMessage("error", "Check unvollständig");
      return;
    }

    // Backend erwartet: { title?, notiz?, results: [{item_id,status,menge_aktuel?,notiz?}] }
    const payload = {
      title: this.form.controls.title.value,
      notiz: this.form.controls.notiz.value,
      results: this.form.controls.results.controls.map((fg) => ({
        item_id: fg.controls.item_id.value,
        status: fg.controls.checked.value ? "ok" : "missing",
        menge_aktuel: fg.controls.checked.value ? (fg.controls.menge_soll.value ?? null) : null,
        notiz: fg.controls.notiz.value ?? "",
      })),
    };

    this.apiHttpService.post(`fahrzeuge/${this.fahrzeugId}/checks`, payload).subscribe({
      next: () => {
        this.uiMessageService.erstelleMessage("success", "Check gespeichert");
        this.router.navigate(["/fahrzeuge"]);
      },
      error: (e) => this.authSessionService.errorAnzeigen(e),
    });
  }
}
