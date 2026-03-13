import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButton } from '@angular/material/button';
import { MatOption } from '@angular/material/core';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { forkJoin } from 'rxjs';

import { HeaderComponent } from '../_template/header/header.component';
import { IMitglied } from '../_interface/mitglied';
import {
  IHomepageDienstposten,
  IHomepagePublicMember,
  IHomepagePublicResponse,
  IHomepagePublicSection,
} from '../_interface/homepage';
import { ApiHttpService } from '../_service/api-http.service';
import { AuthSessionService } from '../_service/auth-session.service';
import { CollectionUtilsService } from '../_service/collection-utils.service';
import { NavigationService } from '../_service/navigation.service';
import { UiMessageService } from '../_service/ui-message.service';
import { UiPageLayoutComponent, UiSectionCardComponent } from '../ui-library';

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
    HeaderComponent,
    UiPageLayoutComponent,
    UiSectionCardComponent,
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInputModule,
    MatAutocompleteModule,
    MatOption,
    MatButton,
  ],
  templateUrl: './homepage.component.html',
  styleUrl: './homepage.component.sass',
})
export class HomepageComponent implements OnInit {
  private apiHttpService = inject(ApiHttpService);
  private authSessionService = inject(AuthSessionService);
  private collectionUtilsService = inject(CollectionUtilsService);
  private navigationService = inject(NavigationService);
  private uiMessageService = inject(UiMessageService);

  title = 'Homepage Dienstpostenplan';
  modul = 'homepage/intern';
  modulBulk = 'homepage/intern/bulk';
  modulContext = 'homepage/context';
  modulPublic = 'homepage/public';

  breadcrumb: any[] = [];
  loading = false;

  sections: HomepageSectionDraft[] = [];
  mitglieder: IMitglied[] = [];
  localPreviewJson = '{\n  "sections": []\n}';
  apiPreviewJson = '{\n  "sections": []\n}';

  private sectionCounter = 0;
  private rowCounter = 0;
  private mitgliederByPkid = new Map<number, IMitglied>();
  private mitgliedControls = new Map<string, FormControl<string>>();

  get apiPublicPath(): string {
    return `${this.apiHttpService.AppUrl}${this.modulPublic}/`;
  }

  ngOnInit(): void {
    sessionStorage.setItem('PageNumber', '2');
    sessionStorage.setItem('Page2', 'HOME');
    this.breadcrumb = this.navigationService.ladeBreadcrumb();
    this.ladeDaten();
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
          this.normalizeSectionsInPlace();
          this.rebuildLocalPreview();
          this.refreshApiPreview();
        } catch (e: any) {
          this.uiMessageService.erstelleMessage('error', String(e));
        } finally {
          this.loading = false;
        }
      },
      error: (error: any) => {
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
    this.rebuildLocalPreview();
  }

  removeSection(section: HomepageSectionDraft): void {
    const confirmDelete = window.confirm(`Sektion "${section.title}" wirklich entfernen?`);
    if (!confirmDelete) {
      return;
    }

    section.members.forEach((member) => this.mitgliedControls.delete(member.local_id));
    this.sections = this.sections.filter((item) => item.local_id !== section.local_id);

    this.normalizeSectionsInPlace();
    this.rebuildLocalPreview();
  }

  addPosition(section: HomepageSectionDraft): void {
    const positionOrder = section.members.length + 1;
    section.members.push(this.createRowDraft(section, `Neue Position ${positionOrder}`, positionOrder));

    this.normalizeSectionsInPlace();
    this.rebuildLocalPreview();
  }

  removePosition(section: HomepageSectionDraft, row: HomepageRowDraft): void {
    const confirmDelete = window.confirm(`Position "${row.position}" wirklich entfernen?`);
    if (!confirmDelete) {
      return;
    }

    section.members = section.members.filter((entry) => entry.local_id !== row.local_id);
    this.mitgliedControls.delete(row.local_id);

    if (section.members.length === 0) {
      section.members.push(this.createRowDraft(section, 'Neue Position', 1));
    }

    this.normalizeSectionsInPlace();
    this.rebuildLocalPreview();
  }

  onSectionMetaChanged(section: HomepageSectionDraft): void {
    section.id = this.normalizeSectionId(section.id || section.title || 'sektion');
    section.title = (section.title || 'Sektion').trim() || 'Sektion';

    this.normalizeSectionsInPlace();
    this.rebuildLocalPreview();
  }

  onRowChanged(section: HomepageSectionDraft, row: HomepageRowDraft, rowIndex: number): void {
    row.position_order = rowIndex + 1;
    row.position = (row.position || '').trim();
    row.section_id = section.id;
    row.section_title = section.title;
    row.section_order = section.order;

    this.rebuildLocalPreview();
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
    this.rebuildLocalPreview();
  }

  clearMitglied(row: HomepageRowDraft): void {
    row.mitglied_id = null;
    row.fallback_name = 'Nicht definiert';
    row.fallback_dienstgrad = '';
    row.fallback_photo = 'X';
    row.fallback_dienstgrad_img = '';

    this.getMitgliedControl(row).setValue('', { emitEvent: false });
    this.rebuildLocalPreview();
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

  resolveAnzeigename(row: HomepageRowDraft): string {
    if (row.mitglied_id) {
      const mitglied = this.mitgliederByPkid.get(row.mitglied_id);
      if (mitglied) {
        return `${mitglied.vorname} ${mitglied.nachname}`.trim();
      }
    }
    return row.fallback_name || 'Nicht definiert';
  }

  resolveDienstgrad(row: HomepageRowDraft): string {
    if (row.mitglied_id) {
      const mitglied = this.mitgliederByPkid.get(row.mitglied_id);
      return (mitglied?.dienstgrad || '').trim();
    }
    return (row.fallback_dienstgrad || '').trim();
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
          try {
            this.sections = this.mapRowsToSections(Array.isArray(savedRows) ? savedRows : []);
            this.mitgliedControls.clear();
            this.normalizeSectionsInPlace();
            this.rebuildLocalPreview();
            this.refreshApiPreview();
            this.uiMessageService.erstelleMessage('success', 'Dienstpostenplan gespeichert.');
          } catch (e: any) {
            this.uiMessageService.erstelleMessage('error', String(e));
          } finally {
            this.loading = false;
          }
        },
        error: (error: any) => {
          this.loading = false;
          this.authSessionService.errorAnzeigen(error);
        },
      });
  }

  apiVorschauNeuLaden(): void {
    this.refreshApiPreview(true);
  }

  private refreshApiPreview(showSuccessMessage = false): void {
    this.apiHttpService.get<IHomepagePublicResponse>(this.modulPublic).subscribe({
      next: (response) => {
        this.apiPreviewJson = JSON.stringify(response ?? { sections: [] }, null, 2);
        if (showSuccessMessage) {
          this.uiMessageService.erstelleMessage('success', 'API-Vorschau aktualisiert.');
        }
      },
      error: () => {
        this.apiPreviewJson = JSON.stringify({ sections: [] }, null, 2);
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

  private rebuildLocalPreview(): void {
    const payload = this.buildPublicPayloadFromSections(this.sections);
    this.localPreviewJson = JSON.stringify(payload, null, 2);
  }

  private buildPublicPayloadFromSections(sections: HomepageSectionDraft[]): IHomepagePublicResponse {
    const normalizedSections: IHomepagePublicSection[] = sections
      .map((section) => ({
        id: section.id,
        title: section.title,
        members: section.members.map((row) => this.buildPublicMemberFromRow(row)),
      }))
      .filter((section) => section.members.length > 0);

    return { sections: normalizedSections };
  }

  private buildPublicMemberFromRow(row: HomepageRowDraft): IHomepagePublicMember {
    if (row.mitglied_id) {
      const mitglied = this.mitgliederByPkid.get(row.mitglied_id);
      if (mitglied) {
        const dienstgrad = (mitglied.dienstgrad || '').trim();
        return {
          photo: String(mitglied.stbnr ?? 'X'),
          name: `${mitglied.vorname} ${mitglied.nachname}`.trim(),
          dienstgrad,
          dienstgrad_img: row.fallback_dienstgrad_img || this.resolveDienstgradImage(dienstgrad),
          position: row.position,
        };
      }
    }

    const dienstgrad = (row.fallback_dienstgrad || '').trim();
    return {
      photo: row.fallback_photo || 'X',
      name: row.fallback_name || 'Nicht definiert',
      dienstgrad,
      dienstgrad_img: row.fallback_dienstgrad_img || this.resolveDienstgradImage(dienstgrad),
      position: row.position,
    };
  }
}
