import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { IMR_UI_COMPONENTS } from '../imr-ui-library';
import { Router } from '@angular/router';
import { interval, Subscription, timer } from 'rxjs';
import { ApiHttpService } from 'src/app/_service/api-http.service';
import { AuthSessionService } from 'src/app/_service/auth-session.service';
import { CollectionUtilsService } from 'src/app/_service/collection-utils.service';
import { NavigationService } from 'src/app/_service/navigation.service';
import { UiMessageService } from 'src/app/_service/ui-message.service';

type NewsItem = {
  foto_url?: string;
  title: string;
  text: string;
};

type TerminItem = {
  start?: string;
  summary?: string;
};

@Component({
  selector: 'app-news-extern',
  standalone: true,
  imports: [...IMR_UI_COMPONENTS],
  templateUrl: './news-extern.component.html',
  styleUrls: ['./news-extern.component.sass']
})
export class NewsExternComponent implements OnInit, OnDestroy {
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  router = inject(Router);

  title = 'Neuigkeiten FF Schwadorf';
  modul = 'news/public';

  // Anzeige-Einstellungen
  dauer_artikel_in_sek = 10;      // Rotationsdauer
  refresh_in_min = 60;             // wie oft Daten neu laden

  daten: NewsItem[] = [];
  currentIndex = 0;
  currentItem: NewsItem | null = null;
  incomingItem: NewsItem | null = null;
  transitionDirection: 'forward' | 'backward' = 'forward';
  transitionInProgress = false;
  transitionActive = false;
  autoplayProgressPercent = 0;

  private rotateSub?: Subscription;
  private refreshSub?: Subscription;
  private progressSub?: Subscription;
  private transitionStartTimeout?: ReturnType<typeof setTimeout>;
  private transitionEndTimeout?: ReturnType<typeof setTimeout>;
  private readonly transitionDurationMs = 420;
  private rotateDurationMs = 10_000;
  private rotateCycleStartedAtMs = 0;

  termine: TerminItem[] = [];

  get hasMultipleNews(): boolean {
    return this.daten.length > 1;
  }

  get currentNewsPosition(): string {
    if (!this.currentItem || this.daten.length === 0) {
      return 'Keine Beiträge verfügbar';
    }
    return `Beitrag ${this.currentIndex + 1} von ${this.daten.length}`;
  }

  get currentNewsProgressPercent(): number {
    if (this.daten.length === 0) {
      return 0;
    }
    return ((this.currentIndex + 1) / this.daten.length) * 100;
  }

  get termineCount(): number {
    return this.termine.length;
  }

  ngOnInit(): void {
    // 1) initial laden
    this.loadData();

    // 2) Rotations-Timer starten
    this.startRotateTimer();

    // 3) Refresh-Timer: sofort feuern (0) und dann alle X Minuten erneut laden
    this.refreshSub = timer(this.refresh_in_min * 60_000, this.refresh_in_min * 60_000).subscribe({
      next: () => this.loadData(),
      error: (e) => this.authSessionService.errorAnzeigen(e)
    });
  }

  ngOnDestroy(): void {
    this.stopRotateTimer();
    this.refreshSub?.unsubscribe();
    this.clearTransitionTimers();
  }

  // -------------------------------------
  // Helpers
  // -------------------------------------
  private startRotateTimer(): void {
    this.stopRotateTimer();

    if (!this.hasMultipleNews) {
      this.autoplayProgressPercent = 0;
      return;
    }

    this.rotateDurationMs = Math.max(1, this.dauer_artikel_in_sek) * 1000;
    this.rotateCycleStartedAtMs = Date.now();
    this.autoplayProgressPercent = 0;

    this.progressSub = interval(100).subscribe(() => {
      const elapsed = Date.now() - this.rotateCycleStartedAtMs;
      this.autoplayProgressPercent = Math.max(0, Math.min(100, (elapsed / this.rotateDurationMs) * 100));
    });

    this.rotateSub = interval(this.rotateDurationMs).subscribe(() => {
      this.navigateByStep(1, false);
      this.rotateCycleStartedAtMs = Date.now();
      this.autoplayProgressPercent = 0;
    });
  }

  private stopRotateTimer(): void {
    this.rotateSub?.unsubscribe();
    this.rotateSub = undefined;
    this.progressSub?.unsubscribe();
    this.progressSub = undefined;
  }

  private navigateByStep(step: 1 | -1, restartTimer: boolean): void {
    if (!this.hasMultipleNews || this.transitionInProgress) {
      return;
    }

    const targetIndex = step === 1
      ? (this.currentIndex + 1) % this.daten.length
      : (this.currentIndex - 1 + this.daten.length) % this.daten.length;

    const direction: 'forward' | 'backward' = step === 1 ? 'forward' : 'backward';
    this.transitionToIndex(targetIndex, direction);

    if (restartTimer) {
      this.startRotateTimer();
    }
  }

  private transitionToIndex(targetIndex: number, direction: 'forward' | 'backward'): void {
    if (this.transitionInProgress || this.daten.length === 0 || targetIndex === this.currentIndex) {
      return;
    }

    this.clearTransitionTimers();
    this.incomingItem = this.daten[targetIndex];
    this.transitionDirection = direction;
    this.transitionInProgress = true;
    this.transitionActive = false;

    this.transitionStartTimeout = setTimeout(() => {
      this.transitionActive = true;
    }, 20);

    this.transitionEndTimeout = setTimeout(() => {
      this.currentIndex = targetIndex;
      this.currentItem = this.incomingItem;
      this.incomingItem = null;
      this.transitionActive = false;
      this.transitionInProgress = false;
      this.clearTransitionTimers();
    }, this.transitionDurationMs);
  }

  private clearTransitionTimers(): void {
    if (this.transitionStartTimeout) {
      clearTimeout(this.transitionStartTimeout);
      this.transitionStartTimeout = undefined;
    }
    if (this.transitionEndTimeout) {
      clearTimeout(this.transitionEndTimeout);
      this.transitionEndTimeout = undefined;
    }
  }

  private resetTransitionState(): void {
    this.clearTransitionTimers();
    this.incomingItem = null;
    this.transitionActive = false;
    this.transitionInProgress = false;
  }

  showPrevious(): void {
    this.navigateByStep(-1, true);
  }

  showNext(): void {
    this.navigateByStep(1, true);
  }

  private loadData(): void {
    this.apiHttpService.get<NewsItem[]>(this.modul).subscribe({
      next: (erg: NewsItem[]) => {
        try {
          const oldLen = this.daten.length;
          this.resetTransitionState();

          this.daten = Array.isArray(erg) ? erg : [];
          // Index gültig halten
          if (this.daten.length === 0) {
            this.currentIndex = 0;
            this.currentItem = null;
            this.autoplayProgressPercent = 0;
          } else {
            if (oldLen === 0) {
              // erstes Laden: bei 0 beginnen
              this.currentIndex = 0;
            } else {
              // nach Refresh: Index modulo neue Länge
              this.currentIndex = this.currentIndex % this.daten.length;
            }
            this.currentItem = this.daten[this.currentIndex];
          }

          // (optional) Rotations-Timer neu starten, falls Dauer geändert/erste Daten
          if (!this.rotateSub || oldLen === 0 || oldLen !== this.daten.length) {
            this.startRotateTimer();
          }

          // externen Kalender laden (unverändert)
          this.apiHttpService.getURL<TerminItem[]>('https://ff-schwadorf.at/v2025/server/kalender/index.php').subscribe({
            next: (k: TerminItem[]) => { this.termine = Array.isArray(k) ? k : []; },
            error: (err: unknown) => this.authSessionService.errorAnzeigen(err)
          });

        } catch (e: unknown) {
          this.uiMessageService.erstelleMessage('error', String(e));
        }
      },
      error: (error: unknown) => {
        this.authSessionService.errorAnzeigen(error);
      }
    });
  }
}
