import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { Observable, forkJoin, map, of } from 'rxjs';
import { IMR_UI_COMPONENTS, ImrBreadcrumbItem } from '../imr-ui-library';
import { IMitglied } from '../_interface/mitglied';
import { IHomepageDienstposten } from '../_interface/homepage';
import { ApiHttpService } from '../_service/api-http.service';
import { AuthSessionService } from '../_service/auth-session.service';
import { CollectionUtilsService } from '../_service/collection-utils.service';
import { NavigationService } from '../_service/navigation.service';
import { UiMessageService } from '../_service/ui-message.service';
interface HomepageSectionTemplate {
  id: string;
  title: string;
  positions: string[];
}

interface HomepageRowDraft extends IHomepageDienstposten {
  local_id: string;
  mitglied_id: number | null;
}

interface HomepageSectionDraft {
  local_id: string;
  id: string;
  title: string;
  order: number;
  members: HomepageRowDraft[];
}

interface PendingPhotoOperation {
  row_key: string;
  file?: File;
  remove_photo?: boolean;
}

const DEFAULT_PLAN_TEMPLATE: ReadonlyArray<HomepageSectionTemplate> = [
  {
    id: 'kommando',
    title: 'Kommando',
    positions: ['Kommandant', 'Kommandant Stv.', 'Leiter des Verwaltungsdienstes'],
  },
  {
    id: 'zugskommandanten',
    title: 'Zugskommandanten',
    positions: ['Zugskommandant', 'Zugskommandant'],
  },
  {
    id: 'gruppenkommandanten',
    title: 'Gruppenkommandanten',
    positions: [
      'Gruppenkommandant',
      'Gruppenkommandant',
      'Gruppenkommandant',
      'Gruppenkommandant',
      'Gruppenkommandant',
    ],
  },
  {
    id: 'sachbearbeiter',
    title: 'Sachbearbeiter',
    positions: [
      'Fahrmeister',
      'Zeugmeister',
      'Ausbilder',
      'Jugendbetreuer',
      'Feuerwehrkurat',
      'SB Nachrichtendienst',
      'SB Schadstoff',
      'SB Feuerwehr Medizinischer Dienst (FMD)',
      'SB Vorbeugender Brandschutz',
      'SB Oeffentlichkeitsarbeit',
      'SB EDV',
      'SB Atemschutz',
    ],
  },
];

@Component({
  selector: 'app-homepage',
  imports: [
    A11yModule,
    FormsModule,
    ReactiveFormsModule,
    ...IMR_UI_COMPONENTS,
    MatInputModule,
    MatAutocompleteModule,
  ],
  templateUrl: './homepage.component.html',
  styleUrl: './homepage.component.sass',
})
export class HomepageComponent implements OnInit, OnDestroy {
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);

  title = 'Homepage Dienstpostenplan';
  modul = 'homepage/intern';
  modulBulk = 'homepage/intern/bulk';
  modulContext = 'homepage/context';

  breadcrumb: ImrBreadcrumbItem[] = [];
  loading = false;

  sections: HomepageSectionDraft[] = [];
  mitglieder: IMitglied[] = [];
  photoModalOpen = false;
  photoModalUrl: string | null = null;

  private sectionCounter = 0;
  private rowCounter = 0;
  private mitgliederByPkid = new Map<number, IMitglied>();
  private mitgliedControls = new Map<string, FormControl<string>>();
  private pendingPhotoUploads = new Map<string, File>();
  private pendingPhotoRemovals = new Set<string>();
  private pendingPhotoPreviewUrls = new Map<string, string>();
  private focusBeforePhotoModal: HTMLElement | null = null;

  ngOnInit(): void {
    sessionStorage.setItem('PageNumber', '2');
    sessionStorage.setItem('Page2', 'HOME');
    this.breadcrumb = this.navigationService.ladeBreadcrumb();
    this.ladeDaten();
  }

  ngOnDestroy(): void {
    this.closePhotoPreview();
    this.clearAllPendingPhotoPreviewUrls();
  }

  private ladeDaten(): void {
    this.loading = true;

    forkJoin({
      rows: this.apiHttpService.get<IHomepageDienstposten[]>(this.modul),
      context: this.apiHttpService.get<{ mitglieder: IMitglied[] }>(this.modulContext),
    }).subscribe({
      next: ({ rows, context }) => {
        try {
          const contextMitglieder = (context?.mitglieder ?? []) as IMitglied[];
          this.mitglieder = this.collectionUtilsService.arraySortByKey(contextMitglieder, 'stbnr') as IMitglied[];
          this.mitgliederByPkid = new Map(this.mitglieder.map((mitglied) => [mitglied.pkid, mitglied]));

          this.sections = this.mapRowsToSections(Array.isArray(rows) ? rows : []);
          this.mitgliedControls.clear();
          this.clearAllPendingPhotoPreviewUrls();
          this.pendingPhotoUploads.clear();
          this.pendingPhotoRemovals.clear();
          this.closePhotoPreview();
          this.normalizeSectionsInPlace();
        } catch (e: unknown) {
          this.uiMessageService.erstelleMessage('error', String(e));
        } finally {
          this.loading = false;
        }
      },
      error: (error: unknown) => {
        this.loading = false;
        this.authSessionService.errorAnzeigen(error);
      },
    });
  }

  private mapRowsToSections(rows: IHomepageDienstposten[]): HomepageSectionDraft[] {
    if (rows.length === 0) {
      return this.createDefaultSections();
    }

    const orderedRows = [...rows].sort((a, b) => {
      const sectionOrderDiff = Number(a.section_order ?? 0) - Number(b.section_order ?? 0);
      if (sectionOrderDiff !== 0) {
        return sectionOrderDiff;
      }

      const rowOrderDiff = Number(a.position_order ?? 0) - Number(b.position_order ?? 0);
      if (rowOrderDiff !== 0) {
        return rowOrderDiff;
      }

      return String(a.position ?? '').localeCompare(String(b.position ?? ''), 'de');
    });

    const grouped = new Map<string, HomepageSectionDraft>();

    for (const row of orderedRows) {
      const sectionId = this.normalizeSectionId(row.section_id || row.section_title || 'sektion');
      const sectionTitle = (row.section_title || sectionId || 'Sektion').trim();
      const sectionOrder = Number(row.section_order ?? grouped.size + 1);

      let section = grouped.get(sectionId);
      if (!section) {
        section = {
          local_id: this.createSectionLocalId(),
          id: sectionId,
          title: sectionTitle,
          order: sectionOrder,
          members: [],
        };
        grouped.set(sectionId, section);
      }

      section.members.push(
        this.createRowDraft(
          section,
          row.position || `Position ${section.members.length + 1}`,
          Number(row.position_order ?? section.members.length + 1),
          row,
        ),
      );
    }

    return Array.from(grouped.values()).sort((a, b) => a.order - b.order);
  }

  private createDefaultSections(): HomepageSectionDraft[] {
    return DEFAULT_PLAN_TEMPLATE.map((template, sectionIndex) => {
      const section: HomepageSectionDraft = {
        local_id: this.createSectionLocalId(),
        id: template.id,
        title: template.title,
        order: sectionIndex + 1,
        members: [],
      };

      section.members = template.positions.map((position, rowIndex) =>
        this.createRowDraft(section, position, rowIndex + 1),
      );

      return section;
    });
  }

  private createRowDraft(
    section: HomepageSectionDraft,
    position: string,
    positionOrder: number,
    source?: Partial<IHomepageDienstposten>,
  ): HomepageRowDraft {
    return {
      id: source?.id,
      pkid: source?.pkid,
      local_id: this.createRowLocalId(),
      section_id: this.normalizeSectionId(source?.section_id || section.id),
      section_title: (source?.section_title || section.title || 'Sektion').trim(),
      section_order: Number(source?.section_order ?? section.order),
      position: (source?.position || position || '').trim(),
      position_order: Number(source?.position_order ?? positionOrder),
      mitglied_id: source?.mitglied_id ?? null,
      mitglied_name: source?.mitglied_name ?? null,
      fallback_name: (source?.fallback_name || 'Nicht definiert').trim() || 'Nicht definiert',
      fallback_dienstgrad: (source?.fallback_dienstgrad || '').trim(),
      fallback_photo: (source?.fallback_photo || 'X').trim() || 'X',
      fallback_dienstgrad_img:
        (source?.fallback_dienstgrad_img || this.resolveDienstgradImage(source?.fallback_dienstgrad || '')).trim(),
      photo_url: source?.photo_url || null,
      created_at: source?.created_at,
      updated_at: source?.updated_at,
    };
  }

  private createSectionLocalId(): string {
    this.sectionCounter += 1;
    return `section-${this.sectionCounter}`;
  }

  private createRowLocalId(): string {
    this.rowCounter += 1;
    return `row-${this.rowCounter}`;
  }

  private normalizeSectionId(value: string): string {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return normalized || 'sektion';
  }

  private makeUniqueSectionId(baseId: string): string {
    const existing = new Set(this.sections.map((section) => section.id));
    if (!existing.has(baseId)) {
      return baseId;
    }

    let counter = 2;
    let candidate = `${baseId}-${counter}`;
    while (existing.has(candidate)) {
      counter += 1;
      candidate = `${baseId}-${counter}`;
    }
    return candidate;
  }

  addSection(): void {
    const order = this.sections.length + 1;
    const baseId = this.normalizeSectionId(`sektion-${order}`);
    const section: HomepageSectionDraft = {
      local_id: this.createSectionLocalId(),
      id: this.makeUniqueSectionId(baseId),
      title: `Neue Sektion ${order}`,
      order,
      members: [],
    };
    section.members.push(this.createRowDraft(section, 'Neue Position', 1));

    this.sections = [...this.sections, section];
    this.normalizeSectionsInPlace();
  }

  removeSection(section: HomepageSectionDraft): void {
    const confirmDelete = window.confirm(`Sektion "${section.title}" wirklich entfernen?`);
    if (!confirmDelete) {
      return;
    }

    section.members.forEach((member) => {
      this.mitgliedControls.delete(member.local_id);
      this.clearPendingPhotoState(member);
    });
    this.sections = this.sections.filter((item) => item.local_id !== section.local_id);

    this.normalizeSectionsInPlace();
  }

  addPosition(section: HomepageSectionDraft): void {
    const positionOrder = section.members.length + 1;
    section.members.push(this.createRowDraft(section, `Neue Position ${positionOrder}`, positionOrder));

    this.normalizeSectionsInPlace();
  }

  removePosition(section: HomepageSectionDraft, row: HomepageRowDraft): void {
    const confirmDelete = window.confirm(`Position "${row.position}" wirklich entfernen?`);
    if (!confirmDelete) {
      return;
    }

    section.members = section.members.filter((entry) => entry.local_id !== row.local_id);
    this.mitgliedControls.delete(row.local_id);
    this.clearPendingPhotoState(row);

    if (section.members.length === 0) {
      section.members.push(this.createRowDraft(section, 'Neue Position', 1));
    }

    this.normalizeSectionsInPlace();
  }

  onSectionMetaChanged(section: HomepageSectionDraft): void {
    section.id = this.normalizeSectionId(section.id || section.title || 'sektion');
    section.title = (section.title || 'Sektion').trim() || 'Sektion';

    this.normalizeSectionsInPlace();
  }

  onRowChanged(section: HomepageSectionDraft, row: HomepageRowDraft, rowIndex: number): void {
    row.position_order = rowIndex + 1;
    row.position = (row.position || '').trim();
    row.section_id = section.id;
    row.section_title = section.title;
    row.section_order = section.order;

  }

  private normalizeSectionsInPlace(): void {
    const usedSectionIds = new Set<string>();

    this.sections = this.sections.map((section, sectionIndex) => {
      let normalizedSectionId = this.normalizeSectionId(section.id || section.title || `sektion-${sectionIndex + 1}`);
      if (usedSectionIds.has(normalizedSectionId)) {
        let suffix = 2;
        while (usedSectionIds.has(`${normalizedSectionId}-${suffix}`)) {
          suffix += 1;
        }
        normalizedSectionId = `${normalizedSectionId}-${suffix}`;
      }
      usedSectionIds.add(normalizedSectionId);

      const normalizedSection: HomepageSectionDraft = {
        ...section,
        order: sectionIndex + 1,
        id: normalizedSectionId,
        title: (section.title || `Sektion ${sectionIndex + 1}`).trim() || `Sektion ${sectionIndex + 1}`,
        members: section.members.map((member, memberIndex) => ({
          ...member,
          section_id: normalizedSectionId,
          section_title: (section.title || `Sektion ${sectionIndex + 1}`).trim() || `Sektion ${sectionIndex + 1}`,
          section_order: sectionIndex + 1,
          position_order: memberIndex + 1,
          position: (member.position || `Position ${memberIndex + 1}`).trim(),
          fallback_name: (member.fallback_name || 'Nicht definiert').trim() || 'Nicht definiert',
          fallback_dienstgrad: (member.fallback_dienstgrad || '').trim(),
          fallback_photo: (member.fallback_photo || 'X').trim() || 'X',
          fallback_dienstgrad_img:
            (member.fallback_dienstgrad_img || this.resolveDienstgradImage(member.fallback_dienstgrad || '')).trim(),
        })),
      };

      return normalizedSection;
    });
  }

  getMitgliedControl(row: HomepageRowDraft): FormControl<string> {
    const existing = this.mitgliedControls.get(row.local_id);
    if (existing) {
      return existing;
    }

    const initialValue = this.resolveMitgliedAutocompleteText(row);
    const created = new FormControl<string>(initialValue, { nonNullable: true });
    this.mitgliedControls.set(row.local_id, created);
    return created;
  }

  private resolveMitgliedAutocompleteText(row: HomepageRowDraft): string {
    if (!row.mitglied_id) {
      return '';
    }

    const mitglied = this.mitgliederByPkid.get(row.mitglied_id);
    return mitglied ? this.getMitgliedLabel(mitglied) : '';
  }

  getFilteredMitglieder(row: HomepageRowDraft): IMitglied[] {
    const search = this.getMitgliedControl(row).value.trim().toLowerCase();
    if (!search) {
      return this.mitglieder;
    }

    return this.mitglieder.filter((mitglied) => this.getMitgliedLabel(mitglied).toLowerCase().includes(search));
  }

  onMitgliedSelected(row: HomepageRowDraft, event: MatAutocompleteSelectedEvent): void {
    const selectedPkid = Number(event.option.value);
    const mitglied = this.mitgliederByPkid.get(selectedPkid);
    if (!mitglied) {
      return;
    }

    row.mitglied_id = selectedPkid;
    row.fallback_name = `${mitglied.vorname} ${mitglied.nachname}`.trim() || 'Nicht definiert';
    row.fallback_dienstgrad = (mitglied.dienstgrad || '').trim();
    row.fallback_photo = String(mitglied.stbnr ?? 'X');
    row.fallback_dienstgrad_img = this.resolveDienstgradImage(row.fallback_dienstgrad);

    this.getMitgliedControl(row).setValue(this.getMitgliedLabel(mitglied), { emitEvent: false });
  }

  onPhotoSelected(row: HomepageRowDraft, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const selectedFile = input?.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith('image/')) {
      this.uiMessageService.erstelleMessage('error', 'Bitte nur Bilddateien auswaehlen.');
      if (input) {
        input.value = '';
      }
      return;
    }

    const maxSizeBytes = this.apiHttpService.MaxUploadSize * 1024;
    if (selectedFile.size > maxSizeBytes) {
      this.uiMessageService.erstelleMessage('error', `Datei ist zu gross (max. ${this.apiHttpService.MaxUploadSize / 1024} MB).`);
      if (input) {
        input.value = '';
      }
      return;
    }

    this.revokePendingPhotoPreview(row.local_id);
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      this.pendingPhotoPreviewUrls.set(row.local_id, URL.createObjectURL(selectedFile));
    }

    this.pendingPhotoUploads.set(row.local_id, selectedFile);
    this.pendingPhotoRemovals.delete(row.local_id);

    if (input) {
      input.value = '';
    }
  }

  removePhoto(row: HomepageRowDraft): void {
    const hadPendingUpload = this.pendingPhotoUploads.has(row.local_id);
    if (hadPendingUpload) {
      this.revokePendingPhotoPreview(row.local_id);
      this.pendingPhotoUploads.delete(row.local_id);
      if (row.photo_url) {
        this.pendingPhotoRemovals.add(row.local_id);
      } else {
        this.pendingPhotoRemovals.delete(row.local_id);
      }
      return;
    }

    if (!row.photo_url) {
      return;
    }

    this.pendingPhotoRemovals.add(row.local_id);
  }

  getPhotoPreviewUrl(row: HomepageRowDraft): string | null {
    if (this.pendingPhotoRemovals.has(row.local_id)) {
      return null;
    }

    const pendingPreviewUrl = this.pendingPhotoPreviewUrls.get(row.local_id);
    if (pendingPreviewUrl) {
      return pendingPreviewUrl;
    }

    return this.normalizePhotoUrl(row.photo_url);
  }

  hasPhotoPreview(row: HomepageRowDraft): boolean {
    return this.getPhotoPreviewUrl(row) !== null;
  }

  openPhotoPreview(row: HomepageRowDraft): void {
    const previewUrl = this.getPhotoPreviewUrl(row);
    if (!previewUrl) {
      this.uiMessageService.erstelleMessage('info', 'Kein Bild fuer die Vorschau vorhanden.');
      return;
    }

    this.focusBeforePhotoModal =
      typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    this.photoModalUrl = previewUrl;
    this.photoModalOpen = true;
  }

  closePhotoPreview(): void {
    this.photoModalOpen = false;
    this.photoModalUrl = null;

    const target = this.focusBeforePhotoModal;
    this.focusBeforePhotoModal = null;
    if (target && typeof target.focus === 'function') {
      target.focus();
    }
  }

  getPhotoStatusText(row: HomepageRowDraft): string {
    const pendingFile = this.pendingPhotoUploads.get(row.local_id);
    if (pendingFile) {
      return `Neues Foto bereit: ${pendingFile.name}`;
    }

    if (this.pendingPhotoRemovals.has(row.local_id)) {
      return 'Foto wird beim Speichern entfernt.';
    }

    if (row.photo_url) {
      return 'Eigenes Foto gespeichert.';
    }

    return 'Kein eigenes Foto gespeichert.';
  }

  getMitgliedLabel(mitglied: IMitglied): string {
    const stbnr = mitglied.stbnr ?? '-';
    const rang = this.getRangText(mitglied.dienstgrad);
    return `${stbnr} - ${mitglied.vorname} ${mitglied.nachname} (${rang})`;
  }

  getRangText(dienstgrad: string | undefined): string {
    const rang = String(dienstgrad ?? '').trim();
    return rang !== '' ? rang : 'ohne Dienstgrad';
  }

  private resolveDienstgradImage(dienstgrad: string | undefined): string {
    const normalized = String(dienstgrad ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    const map: Record<string, string> = {
      fm: 'Dgrd_fm.noe.svg',
      ofm: 'Dgrd_ofm.noe.svg',
      lm: 'Dgrd_lm.noe.svg',
      hlm: 'Dgrd_hlm.noe.svg',
      bm: 'Dgrd_bm.noe.svg',
      hbm: 'Dgrd_hbm.noe.svg',
      obi: 'Dgrd_obi.noe.svg',
      hbi: 'Dgrd_hbi.noe.svg',
      ov: 'Dgrd_ov.noe.svg',
      v: 'Dgrd_v.noe.svg',
      fkur: 'Dgrd_fkur.noe.svg',
      sb: 'Dgrd_sbea.noe.svg',
      sbea: 'Dgrd_sbea.noe.svg',
    };

    if (map[normalized]) {
      return map[normalized];
    }

    if (normalized.startsWith('e') && map[normalized.slice(1)]) {
      return map[normalized.slice(1)];
    }

    return normalized ? `Dgrd_${normalized}.noe.svg` : '';
  }

  speichern(): void {
    this.normalizeSectionsInPlace();

    if (this.sections.length === 0) {
      this.uiMessageService.erstelleMessage('error', 'Bitte mindestens eine Sektion anlegen.');
      return;
    }

    for (const section of this.sections) {
      if (!section.id || !section.title) {
        this.uiMessageService.erstelleMessage('error', 'Jede Sektion braucht eine ID und einen Titel.');
        return;
      }

      for (const row of section.members) {
        if (!row.position) {
          this.uiMessageService.erstelleMessage('error', 'Bitte alle Positionen ausfuellen.');
          return;
        }
      }
    }

    const pendingPhotoOperations = this.collectPendingPhotoOperations();

    this.loading = true;
    this.apiHttpService
      .post<IHomepageDienstposten[]>(
        this.modulBulk,
        {
          replace: true,
          rows: this.flattenRowsForSave(),
        },
        false,
      )
      .subscribe({
        next: (savedRows) => {
          const normalizedSavedRows = Array.isArray(savedRows) ? savedRows : [];
          this.executePendingPhotoOperations(normalizedSavedRows, pendingPhotoOperations).subscribe({
            next: (finalRows) => {
              try {
                this.sections = this.mapRowsToSections(finalRows);
                this.mitgliedControls.clear();
                this.clearAllPendingPhotoPreviewUrls();
                this.pendingPhotoUploads.clear();
                this.pendingPhotoRemovals.clear();
                this.closePhotoPreview();
                this.normalizeSectionsInPlace();
                this.uiMessageService.erstelleMessage('success', 'Dienstpostenplan gespeichert.');
              } catch (e: unknown) {
                this.uiMessageService.erstelleMessage('error', String(e));
              } finally {
                this.loading = false;
              }
            },
            error: (error: unknown) => {
              this.loading = false;
              this.authSessionService.errorAnzeigen(error);
            },
          });
        },
        error: (error: unknown) => {
          this.loading = false;
          this.authSessionService.errorAnzeigen(error);
        },
      });
  }

  private flattenRowsForSave(): IHomepageDienstposten[] {
    return this.sections.flatMap((section) =>
      section.members.map((row) => ({
        id: row.id,
        section_id: section.id,
        section_title: section.title,
        section_order: section.order,
        position: row.position,
        position_order: row.position_order,
        mitglied_id: row.mitglied_id,
        fallback_name: row.fallback_name,
        fallback_dienstgrad: row.fallback_dienstgrad,
        fallback_photo: row.fallback_photo,
        fallback_dienstgrad_img: row.fallback_dienstgrad_img,
      })),
    );
  }

  private collectPendingPhotoOperations(): PendingPhotoOperation[] {
    return this.sections.flatMap((section) =>
      section.members
        .map((row) => {
          const file = this.pendingPhotoUploads.get(row.local_id);
          const removePhoto = this.pendingPhotoRemovals.has(row.local_id);

          if (!file && !removePhoto) {
            return null;
          }

          return {
            row_key: this.createRowKey(section.id, section.order, row.position_order),
            file,
            remove_photo: removePhoto,
          } as PendingPhotoOperation;
        })
        .filter((item): item is PendingPhotoOperation => item !== null),
    );
  }

  private executePendingPhotoOperations(
    savedRows: IHomepageDienstposten[],
    operations: PendingPhotoOperation[],
  ): Observable<IHomepageDienstposten[]> {
    if (operations.length === 0 || savedRows.length === 0) {
      return of(savedRows);
    }

    const savedRowsByKey = new Map<string, IHomepageDienstposten>();
    for (const row of savedRows) {
      savedRowsByKey.set(this.createRowKey(row.section_id, row.section_order, row.position_order), row);
    }

    const updateRequests = operations
      .map((operation) => {
        const target = savedRowsByKey.get(operation.row_key);
        if (!target?.id) {
          return null;
        }

        if (operation.file) {
          const payload = new FormData();
          payload.append('photo', operation.file, operation.file.name);
          return this.apiHttpService.patch<IHomepageDienstposten>(this.modul, target.id, payload, true);
        }

        if (operation.remove_photo) {
          return this.apiHttpService.patch<IHomepageDienstposten>(this.modul, target.id, { remove_photo: true }, false);
        }

        return null;
      })
      .filter((item): item is Observable<IHomepageDienstposten> => item !== null);

    if (updateRequests.length === 0) {
      return of(savedRows);
    }

    return forkJoin(updateRequests).pipe(
      map((updatedRows) => {
        const updatedById = new Map<string, IHomepageDienstposten>();

        for (const row of savedRows) {
          if (row.id) {
            updatedById.set(String(row.id), row);
          }
        }

        for (const row of updatedRows) {
          if (row.id) {
            updatedById.set(String(row.id), row);
          }
        }

        return savedRows.map((row) => {
          if (!row.id) {
            return row;
          }
          return updatedById.get(String(row.id)) || row;
        });
      }),
    );
  }

  private createRowKey(sectionId: string, sectionOrder: number, positionOrder: number): string {
    return `${sectionId}|${sectionOrder}|${positionOrder}`;
  }

  private normalizePhotoUrl(rawValue: string | null | undefined): string | null {
    const value = String(rawValue || '').trim();
    if (!value) {
      return null;
    }

    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
      return value;
    }

    return `${this.apiHttpService.AppUrl}${value.replace(/^\/+/, '')}`;
  }

  private clearPendingPhotoState(row: HomepageRowDraft): void {
    this.revokePendingPhotoPreview(row.local_id);
    this.pendingPhotoUploads.delete(row.local_id);
    this.pendingPhotoRemovals.delete(row.local_id);
  }

  private revokePendingPhotoPreview(localId: string): void {
    const objectUrl = this.pendingPhotoPreviewUrls.get(localId);
    if (objectUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(objectUrl);
    }
    this.pendingPhotoPreviewUrls.delete(localId);
  }

  private clearAllPendingPhotoPreviewUrls(): void {
    for (const objectUrl of this.pendingPhotoPreviewUrls.values()) {
      if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(objectUrl);
      }
    }
    this.pendingPhotoPreviewUrls.clear();
  }
}
