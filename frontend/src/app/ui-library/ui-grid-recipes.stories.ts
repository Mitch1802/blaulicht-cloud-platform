import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { MatCardModule } from '@angular/material/card';

const meta: Meta = {
  title: 'Design System/Layout/Grid Recipes',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Copy/Paste-Rezepte für responsive Grid-Aufteilungen (Mobile/Desktop) mit app-col Klassen.',
      },
    },
  },
  decorators: [
    moduleMetadata({
      imports: [MatCardModule],
    }),
  ],
};

export default meta;
type Story = StoryObj;

export const LivePreview: Story = {
  render: () => ({
    template: `
      <mat-card class="settings-card" style="max-width: 1100px;">
        <mat-card-header>
          <mat-card-title>Grid Recipes Live Preview</mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <style>
            .bp-indicator {
              margin: 0 0 .9rem;
              padding: .45rem .65rem;
              border: 1px solid rgba(0,0,0,.12);
              border-radius: .45rem;
              background: rgba(0,0,0,.03);
              font-weight: 600;
            }

            .bp-label {
              display: none;
            }

            .bp-mobile {
              display: inline;
            }

            @media (min-width: 768px) {
              .bp-mobile {
                display: none;
              }

              .bp-tablet {
                display: inline;
              }
            }

            @media (min-width: 1200px) {
              .bp-tablet {
                display: none;
              }

              .bp-desktop {
                display: inline;
              }
            }
          </style>

          <div class="bp-indicator">
            Aktueller Breakpoint:
            <span class="bp-label bp-mobile">Mobile (&lt; 768px)</span>
            <span class="bp-label bp-tablet">Tablet (≥ 768px)</span>
            <span class="bp-label bp-desktop">Desktop (≥ 1200px)</span>
          </div>

          <p style="margin:0 0 .9rem; color: rgba(0,0,0,.72);">
            Resize das Storybook-Fenster, um die Breakpoints zu sehen (Mobile, Tablet, Desktop).
          </p>

          <h3 style="margin:.6rem 0 .45rem;">2 Spalten (Desktop), mobil untereinander</h3>
          <section class="app-grid" style="margin-bottom: .9rem;">
            <div class="app-col-12 app-col-lg-6" style="padding:.6rem; border:1px dashed rgba(0,0,0,.22); border-radius:.45rem; background: rgba(0,0,0,.02);">A: app-col-12 app-col-lg-6</div>
            <div class="app-col-12 app-col-lg-6" style="padding:.6rem; border:1px dashed rgba(0,0,0,.22); border-radius:.45rem; background: rgba(0,0,0,.02);">B: app-col-12 app-col-lg-6</div>
          </section>

          <h3 style="margin:.6rem 0 .45rem;">3 Spalten (Desktop), mobil untereinander</h3>
          <section class="app-grid" style="margin-bottom: .9rem;">
            <div class="app-col-12 app-col-lg-4" style="padding:.6rem; border:1px dashed rgba(0,0,0,.22); border-radius:.45rem; background: rgba(0,0,0,.02);">1: app-col-12 app-col-lg-4</div>
            <div class="app-col-12 app-col-lg-4" style="padding:.6rem; border:1px dashed rgba(0,0,0,.22); border-radius:.45rem; background: rgba(0,0,0,.02);">2: app-col-12 app-col-lg-4</div>
            <div class="app-col-12 app-col-lg-4" style="padding:.6rem; border:1px dashed rgba(0,0,0,.22); border-radius:.45rem; background: rgba(0,0,0,.02);">3: app-col-12 app-col-lg-4</div>
          </section>

          <h3 style="margin:.6rem 0 .45rem;">Master/Detail (8/4)</h3>
          <section class="app-grid" style="margin-bottom: .9rem;">
            <div class="app-col-12 app-col-lg-8" style="padding:.6rem; border:1px dashed rgba(0,0,0,.22); border-radius:.45rem; background: rgba(0,0,0,.02);">Master: app-col-12 app-col-lg-8</div>
            <div class="app-col-12 app-col-lg-4" style="padding:.6rem; border:1px dashed rgba(0,0,0,.22); border-radius:.45rem; background: rgba(0,0,0,.02);">Detail: app-col-12 app-col-lg-4</div>
          </section>

          <h3 style="margin:.6rem 0 .45rem;">Ab Tablet zweispaltig</h3>
          <section class="app-grid">
            <div class="app-col-12 app-col-md-6" style="padding:.6rem; border:1px dashed rgba(0,0,0,.22); border-radius:.45rem; background: rgba(0,0,0,.02);">A: app-col-12 app-col-md-6</div>
            <div class="app-col-12 app-col-md-6" style="padding:.6rem; border:1px dashed rgba(0,0,0,.22); border-radius:.45rem; background: rgba(0,0,0,.02);">B: app-col-12 app-col-md-6</div>
          </section>
        </mat-card-content>
      </mat-card>
    `,
  }),
};
