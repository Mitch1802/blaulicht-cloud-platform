import { Component, OnInit, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
import {
  ImrHeaderComponent,
  ImrCardComponent,
  ImrButtonComponent,
  ImrFormFieldComponent,
  ImrTopActionsComponent,
  UiControlErrorsDirective,
} from '../imr-ui-library';

@Component({
  selector: 'app-eigene-daten',
  imports: [
    ImrHeaderComponent, 
    ImrCardComponent, 
    FormsModule, 
    ReactiveFormsModule, 
    MatInputModule,
    ImrFormFieldComponent,
    ImrTopActionsComponent,
    UiControlErrorsDirective,
    ImrButtonComponent,
  ],
  templateUrl: './eigene-daten.component.html',
  styleUrl: './eigene-daten.component.sass'
})
export class EigeneDatenComponent implements OnInit {
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  title: string = "Eigene Daten";
  modul: string = "users/self";

  breadcrumb: any = [];

  formModul = new FormGroup({
    id: new FormControl(''),
    email: new FormControl('', Validators.email),
    password1: new FormControl('', Validators.minLength(9)),
    password2: new FormControl('', Validators.minLength(9))
  });

  get passwortAendernErlaubt(): boolean {
    const password1 = (this.formModul.controls["password1"].value ?? "").toString();
    const password2 = (this.formModul.controls["password2"].value ?? "").toString();

    return password1.length > 8 && password2.length > 8 && password1 === password2;
  }

  ngOnInit(): void {
    sessionStorage.setItem("PageNumber", "2");
    sessionStorage.setItem("Page2", "V_ED");
    this.breadcrumb = this.navigationService.ladeBreadcrumb();
    this.formModul.disable();

    this.apiHttpService.get(this.modul).subscribe({
      next: (erg: any) => {
        try {
          this.formModul.setValue({
            id: erg.id,
            email: erg.email || '',
            password1: "",
            password2: ""
          });
          this.formModul.enable();
        } catch (e: any) {
          this.uiMessageService.erstelleMessage("error", e);
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  emailSpeichern(): void {
    const payload = { email: this.formModul.controls["email"].value };

    this.apiHttpService.patch(this.modul, '', payload, false).subscribe({
      next: (erg: any) => {
        try {
          this.formModul.patchValue({ email: erg.email || '' });
          this.uiMessageService.erstelleMessage("success", "E-Mail-Adresse erfolgreich geändert!");
        } catch (e: any) {
          this.uiMessageService.erstelleMessage("error", e);
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }

  passwortAendern(): void {
    const password = (this.formModul.controls["password1"].value ?? "").toString();
    const password2 = (this.formModul.controls["password2"].value ?? "").toString();

    if (password.length <= 8 || password2.length <= 8) {
      this.uiMessageService.erstelleMessage("error", "Das Passwort muss länger als 8 Zeichen sein!");
      return;
    }

    if (password !== password2) {
      this.uiMessageService.erstelleMessage("error", "Die Passwörter müssen übereinstimmen!");
      return;
    }

    const dict = {
      "password": password
    }
    const idValue = this.formModul.controls["id"].value!;
    this.apiHttpService.patch("users/change_password", idValue, dict, false).subscribe({
      next: (erg: any) => {
        try {
          this.formModul.controls["password1"].setValue("");
          this.formModul.controls["password2"].setValue("");
          this.uiMessageService.erstelleMessage("success", "Passwort erfolgreich geändert!");
        } catch (e: any) {
          this.uiMessageService.erstelleMessage("error", e);
        }
      },
      error: (error: any) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }
}
