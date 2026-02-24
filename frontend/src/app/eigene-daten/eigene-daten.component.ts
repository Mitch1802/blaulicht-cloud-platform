import { Component, OnInit, Output, EventEmitter, inject } from '@angular/core';
import { FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IBenutzer } from 'src/app/_interface/benutzer';
import { GlobalDataService } from 'src/app/_service/global-data.service';
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
  globalDataService = inject(GlobalDataService);

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
    this.breadcrumb = this.globalDataService.ladeBreadcrumb();
    this.formModul.disable();

    this.globalDataService.get(this.modul).subscribe({
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
          this.globalDataService.erstelleMessage("error", e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      }
    });
  }

  datenSpeichern(): void {
    if (this.formModul.controls["password1"].value !== "" && this.formModul.controls["password2"].value !== "" && this.formModul.controls["password1"].value !== this.formModul.controls["password2"].value) {
      this.globalDataService.erstelleMessage("error", "Die Passwörter müssen übereinstimmen!");
      return
    }
    const object = this.formModul.value;
    const idValue = this.formModul.controls["id"].value;

    delete object.password2;

    this.globalDataService.patch(this.modul, '', object, false).subscribe({
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
          this.globalDataService.erstelleMessage("success", "Benutzer erfolgreich geändert!");
        } catch (e: any) {
          this.globalDataService.erstelleMessage("error", e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      }
    });
  }


  passwortAendern(): void {
    if (this.formModul.controls["password1"].value !== "" && this.formModul.controls["password2"].value !== "" && this.formModul.controls["password1"].value !== this.formModul.controls["password2"].value) {
      this.globalDataService.erstelleMessage("error", "Die Passwörter müssen übereinstimmen!");
      return
    }
    let dict = {
      "password": this.formModul.controls["password1"].value
    }
    let idValue = this.formModul.controls["id"].value!;
    this.globalDataService.patch("users/change_password", idValue, dict, false).subscribe({
      next: (erg: any) => {
        try {
          this.formModul.controls["password1"].setValue("");
          this.formModul.controls["password2"].setValue("");
          this.globalDataService.erstelleMessage("success", "User Passwort erfolgreich geändert!");
        } catch (e: any) {
          this.globalDataService.erstelleMessage("error", e);
        }
      },
      error: (error: any) => {
        this.globalDataService.errorAnzeigen(error);
      }
    });
  }
}
