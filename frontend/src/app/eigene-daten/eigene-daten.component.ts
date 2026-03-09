import { Component, OnInit, Output, EventEmitter, inject } from '@angular/core';
import { FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IBenutzer } from 'src/app/_interface/benutzer';
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';

import { MatButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { HeaderComponent } from '../_template/header/header.component';

@Component({
  selector: 'app-eigene-daten',
  imports: [HeaderComponent, MatCardModule, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatButton, MatInput, MatError],
  templateUrl: './eigene-daten.component.html',
  styleUrl: './eigene-daten.component.sass'
})
export class EigeneDatenComponent implements OnInit {
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  title: string = "Eigenes Passwort ändern";
  modul: string = "users/self";
  username: string = '';

  breadcrumb: any = [];

  benutzer: IBenutzer[] = [];

  formModul = new FormGroup({
    id: new FormControl(''),
    username: new FormControl('', Validators.required),
    first_name: new FormControl('', Validators.required),
    last_name: new FormControl('', Validators.required),
    password1: new FormControl('', Validators.minLength(8)),
    password2: new FormControl('', Validators.minLength(8))
  });

  ngOnInit(): void {
    sessionStorage.setItem("PageNumber", "2");
    sessionStorage.setItem("Page2", "V_ED");
    this.breadcrumb = this.navigationService.ladeBreadcrumb();
    this.formModul.disable();

    this.apiHttpService.get(this.modul).subscribe({
      next: (erg: any) => {
        try {
          this.username = erg.username;
          sessionStorage.setItem("Benutzername", this.username);
          this.formModul.setValue({
            id: erg.id,
            username: erg.username,
            first_name: erg.first_name,
            last_name: erg.last_name,
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

  datenSpeichern(): void {
    if (this.formModul.controls["password1"].value !== "" && this.formModul.controls["password2"].value !== "" && this.formModul.controls["password1"].value !== this.formModul.controls["password2"].value) {
      this.uiMessageService.erstelleMessage("error", "Die Passwörter müssen übereinstimmen!");
      return
    }
    const object = this.formModul.value;
    const idValue = this.formModul.controls["id"].value;

    delete object.password2;

    this.apiHttpService.patch(this.modul, '', object, false).subscribe({
      next: (erg: any) => {
        try {
          sessionStorage.setItem("Benutzername", erg.username);
          this.formModul.setValue({
            id: erg.id,
            username: erg.username,
            first_name: erg.first_name,
            last_name: erg.last_name,
            password1: "",
            password2: ""
          });
          this.uiMessageService.erstelleMessage("success", "Benutzer erfolgreich geändert!");
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
    if (this.formModul.controls["password1"].value !== "" && this.formModul.controls["password2"].value !== "" && this.formModul.controls["password1"].value !== this.formModul.controls["password2"].value) {
      this.uiMessageService.erstelleMessage("error", "Die Passwörter müssen übereinstimmen!");
      return
    }
    let dict = {
      "password": this.formModul.controls["password1"].value
    }
    let idValue = this.formModul.controls["id"].value!;
    this.apiHttpService.patch("users/change_password", idValue, dict, false).subscribe({
      next: (erg: any) => {
        try {
          this.formModul.controls["password1"].setValue("");
          this.formModul.controls["password2"].setValue("");
          this.uiMessageService.erstelleMessage("success", "User Passwort erfolgreich geändert!");
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
