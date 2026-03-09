import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { HeaderComponent } from './header.component';
import { AuthSessionService } from 'src/app/_service/auth-session.service';

type HeaderStoryArgs = HeaderComponent & {
  breadcrumbPreset?: 'kurz' | 'mittel' | 'lang';
  loading?: boolean;
  mobileWidth?: boolean;
};

const createAuthSessionMock = (_loading: boolean) => ({
  abmelden: () => {},
});

const breadcrumbShort = [
  { kuerzel: 'Start', link: '/start' },
  { kuerzel: 'Einsatzberichte', link: '/einsatzberichte' },
  { kuerzel: 'Neu', link: null },
];

const breadcrumbMedium = [
  { kuerzel: 'Start', link: '/start' },
  { kuerzel: 'Verwaltung', link: '/verwaltung' },
  { kuerzel: 'Einsatzberichte', link: '/einsatzberichte' },
  { kuerzel: 'Archiv', link: '/einsatzberichte/archiv' },
  { kuerzel: 'Jahr 2026', link: null },
];

const breadcrumbLong = [
  { kuerzel: 'Start', link: '/start' },
  { kuerzel: 'Verwaltung', link: '/verwaltung' },
  { kuerzel: 'Einsatzberichte', link: '/einsatzberichte' },
  { kuerzel: 'Archiv', link: '/einsatzberichte/archiv' },
  { kuerzel: 'Jahr 2026', link: '/einsatzberichte/archiv/2026' },
  { kuerzel: 'März', link: '/einsatzberichte/archiv/2026/03' },
  { kuerzel: 'Brandmeldealarm Wohnhaus', link: null },
];

const getBreadcrumbByPreset = (preset: 'kurz' | 'mittel' | 'lang') => {
  if (preset === 'kurz') {
    return breadcrumbShort;
  }

  if (preset === 'mittel') {
    return breadcrumbMedium;
  }

  return breadcrumbLong;
};

const meta: Meta<HeaderStoryArgs> = {
  title: 'Design System/Layout/App Header',
  component: HeaderComponent,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Produktiver App-Header mit Toolbar, Abmelden-Icon, optionaler Ladeanzeige und Breadcrumb-Navigation.',
      },
    },
  },
  decorators: [
    applicationConfig({
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        {
          provide: AuthSessionService,
          useValue: createAuthSessionMock(false),
        },
      ],
    }),
  ],
  args: {
    breadcrumb: breadcrumbShort,
  },
};

export default meta;
type Story = StoryObj<HeaderStoryArgs>;

export const Default: Story = {};

export const WithoutBreadcrumb: Story = {
  args: {
    breadcrumb: [],
  },
};

export const Loading: Story = {
  decorators: [
    applicationConfig({
      providers: [
        {
          provide: AuthSessionService,
          useValue: createAuthSessionMock(true),
        },
      ],
    }),
  ],
};

export const LongBreadcrumbMobile: Story = {
  args: {
    breadcrumb: breadcrumbLong,
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 390px; border: 1px solid rgba(0,0,0,.12); margin: 0 auto;">
        <app-header [breadcrumb]="breadcrumb"></app-header>
      </div>
    `,
  }),
};

export const LongBreadcrumbMobileLoading: Story = {
  args: {
    breadcrumb: breadcrumbLong,
  },
  decorators: [
    applicationConfig({
      providers: [
        {
          provide: AuthSessionService,
          useValue: createAuthSessionMock(true),
        },
      ],
    }),
  ],
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 390px; border: 1px solid rgba(0,0,0,.12); margin: 0 auto;">
        <app-header [breadcrumb]="breadcrumb"></app-header>
      </div>
    `,
  }),
};

export const InteractiveBreadcrumbLength: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Preset-Hilfe: kurz = Standard-Unterseite, mittel = Verwaltungs-/Listenebene, lang = tiefe Detailnavigation (Archiv/Unterebene). Kombinierbar mit mobileWidth und loading.',
      },
    },
  },
  argTypes: {
    breadcrumbPreset: {
      control: { type: 'radio' },
      options: ['kurz', 'mittel', 'lang'],
      description: 'Vordefinierte Breadcrumb-Länge (kurz/mittel/lang)',
    },
    loading: {
      control: { type: 'boolean' },
      description: 'Zeigt den Ladebalken unter der Toolbar',
    },
    mobileWidth: {
      control: { type: 'boolean' },
      description: 'Rendert den Header in mobiler Breite (390px)',
    },
  },
  args: {
    breadcrumbPreset: 'mittel',
    loading: false,
    mobileWidth: true,
  },
  render: (args: HeaderStoryArgs) => ({
    props: {
      breadcrumb: getBreadcrumbByPreset(args.breadcrumbPreset ?? 'mittel'),
    },
    applicationConfig: {
      providers: [
        {
          provide: AuthSessionService,
          useValue: createAuthSessionMock(args.loading ?? false),
        },
      ],
    },
    template: args.mobileWidth ?? true
      ? `
          <div style="max-width: 390px; border: 1px solid rgba(0,0,0,.12); margin: 0 auto;">
            <app-header [breadcrumb]="breadcrumb"></app-header>
          </div>
        `
      : `
          <app-header [breadcrumb]="breadcrumb"></app-header>
        `,
  }),
};
