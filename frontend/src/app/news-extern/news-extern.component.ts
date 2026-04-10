import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ImrPageLayoutComponent } from '../imr-ui-library';
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
  imports: [ImrPageLayoutComponent],
  templateUrl: './news-extern.component.html',
  styleUrls: ['./news-extern.component.sass']
})
export class NewsExternComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);
  router = inject(Router);

  title = 'Neuigkeiten FF Schwadorf';
  modul = 'news/public';

  // Anzeige-Einstellungen
  dauer_artikel_in_sek = 20;      // Rotationsdauer
  refresh_in_min = 60;             // wie oft Daten neu laden

  daten: NewsItem[] = [];
  currentIndex = 0;
  currentItem: NewsItem | null = null;
  incomingItem: NewsItem | null = null;
  transitionDirection: 'forward' | 'backward' = 'forward';
  transitionInProgress = false;
  transitionActive = false;
  currentImageLoading = false;
  incomingImageLoading = false;

  private rotateSub?: Subscription;
  private refreshSub?: Subscription;
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

    // 2) Refresh-Timer: nach X Minuten erneut laden
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
      return;
    }

    this.rotateDurationMs = Math.max(1, this.dauer_artikel_in_sek) * 1000;
    this.rotateCycleStartedAtMs = Date.now();

    this.rotateSub = interval(this.rotateDurationMs).subscribe(() => {
      this.navigateByStep(1, false);
      this.rotateCycleStartedAtMs = Date.now();
      this.cdr.detectChanges();
    });
  }

  private stopRotateTimer(): void {
    this.rotateSub?.unsubscribe();
    this.rotateSub = undefined;
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
    this.incomingImageLoading = !!this.incomingItem?.foto_url;
    this.transitionDirection = direction;
    this.transitionInProgress = true;
    this.transitionActive = false;

    this.transitionStartTimeout = setTimeout(() => {
      this.transitionActive = true;
      this.cdr.detectChanges();
    }, 20);

    this.transitionEndTimeout = setTimeout(() => {
      this.currentIndex = targetIndex;
      this.currentItem = this.incomingItem;
      this.currentImageLoading = this.incomingImageLoading;
      this.incomingItem = null;
      this.incomingImageLoading = false;
      this.transitionActive = false;
      this.transitionInProgress = false;
      this.clearTransitionTimers();
      this.cdr.detectChanges();
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
    this.incomingImageLoading = false;
    this.transitionActive = false;
    this.transitionInProgress = false;
  }

  onImageLoaded(target: 'current' | 'incoming'): void {
    if (target === 'current') {
      this.currentImageLoading = false;
    } else {
      this.incomingImageLoading = false;
    }
    this.cdr.detectChanges();
  }

  onImageLoadError(target: 'current' | 'incoming'): void {
    this.onImageLoaded(target);
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
            this.stopRotateTimer();
            this.currentIndex = 0;
            this.currentItem = null;
            this.currentImageLoading = false;
          } else {
            if (oldLen === 0) {
              // erstes Laden: bei 0 beginnen
              this.currentIndex = 0;
            } else {
              // nach Refresh: Index modulo neue Länge
              this.currentIndex = this.currentIndex % this.daten.length;
            }
            this.currentItem = this.daten[this.currentIndex];
            this.currentImageLoading = !!this.currentItem?.foto_url;
            this.startRotateTimer();
            this.cdr.detectChanges();
          }

          // externen Kalender laden (unverändert)
          this.apiHttpService.getURL<TerminItem[]>('https://ff-schwadorf.at/v2026/server/kalender/index.php').subscribe({
            next: (k: TerminItem[]) => { this.termine = Array.isArray(k) ? k : []; },
            error: (_err: unknown) => {
              // Externe Terminquelle ist optional; bei Fehlern Feed weiter anzeigen
              // und keine irreführende Snackbar (z. B. "true") auslösen.
              this.termine = [];
            }
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

