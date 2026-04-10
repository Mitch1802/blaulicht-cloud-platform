import { Injectable, inject } from '@angular/core';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class UiMessageService {
  private snackBar = inject(MatSnackBar);

  MessageShowInSeconds = 5;

  private readonly snackBarBaseClass = 'app-snackbar';
  private readonly snackBarTypeClassMap: Record<string, string> = {
    success: 'app-snackbar--success',
    info: 'app-snackbar--info',
    error: 'app-snackbar--error',
  };

  erstelleMessage(art: string, msg: string): void {
    const horizontalPosition: MatSnackBarHorizontalPosition = 'center';
    const verticalPosition: MatSnackBarVerticalPosition = 'bottom';
    const variantClass = this.snackBarTypeClassMap[art] ?? this.snackBarTypeClassMap.info;
    const panelClass = [this.snackBarBaseClass, variantClass];

    this.snackBar.open(String(msg ?? ''), 'X', {
      horizontalPosition,
      verticalPosition,
      duration: this.MessageShowInSeconds * 1000,
      panelClass,
    });
  }
}

