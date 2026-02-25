import { Routes } from '@angular/router';
import { authGuard } from './_guards/auth.guard';
import { guestGuard } from './_guards/guest.guard';

export const routes: Routes = [
  {
    path: '', redirectTo: 'login', pathMatch: 'full'
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import("./login/login.component").then(m => m.LoginComponent),
  },
  {
    path: 'start',
    canActivate: [authGuard],
    loadComponent: () => import("./start/start.component").then(m => m.StartComponent),
  },
  {
    path: 'fmd',
    canActivate: [authGuard],
    loadComponent: () => import("./fmd/fmd.component").then(m => m.FmdComponent),
  },
  {
    path: 'mitglied',
    canActivate: [authGuard],
    loadComponent: () => import("./mitglied/mitglied.component").then(m => m.MitgliedComponent),
  },
  {
    path: 'atemschutz',
    canActivate: [authGuard],
    loadComponent: () => import("./atemschutz/atemschutz.component").then(m => m.AtemschutzComponent),
  },
  {
    path: 'atemschutz/masken',
    canActivate: [authGuard],
    loadComponent: () => import("./_template/atemschutz-masken/atemschutz-masken.component").then(m => m.AtemschutzMaskenComponent),
  },
  {
    path: 'atemschutz/geraete',
    canActivate: [authGuard],
    loadComponent: () => import("./_template/atemschutz-geraete/atemschutz-geraete.component").then(m => m.AtemschutzGeraeteComponent),
  },
  {
    path: 'atemschutz/messgeraete',
    canActivate: [authGuard],
    loadComponent: () => import("./_template/atemschutz-messgeraete/atemschutz-messgeraete.component").then(m => m.AtemschutzMessgeraeteComponent),
  },
  {
    path: 'atemschutz/dienstbuch',
    canActivate: [authGuard],
    loadComponent: () => import("./_template/atemschutz-dienstbuch/atemschutz-dienstbuch.component").then(m => m.AtemschutzDienstbuchComponent),
  },
  {
    path: 'news',
    canActivate: [authGuard],
    loadComponent: () => import("./news/news.component").then(m => m.NewsComponent),
  },
  {
    path: 'newsfeed',
    loadComponent: () => import("./news-extern/news-extern.component").then(m => m.NewsExternComponent),
  },
  {
    path: 'inventar',
    canActivate: [authGuard],
    loadComponent: () => import("./inventar/inventar.component").then(m => m.InventarComponent),
  },
  {
    path: 'einsatzbericht',
    canActivate: [authGuard],
    loadComponent: () => import("./einsatzbericht/einsatzbericht.component").then(m => m.EinsatzberichtComponent),
  },
  {
    path: "fahrzeuge",
    canActivate: [authGuard],
    loadComponent: () => import("./fahrzeug/fahrzeug.component").then(m => m.FahrzeugComponent),
  },
  {
    path: "fahrzeuge/:id/check",
    canActivate: [authGuard],
    loadComponent: () => import("./fahrzeug/fahrzeug-check.component").then(m => m.FahrzeugCheckComponent),
  },
  {
    path: "public/fahrzeuge/:publicId",
    loadComponent: () => import("./fahrzeug/public-fahrzeug.component").then(m => m.PublicFahrzeugComponent),
  },
  {
    path: 'verwaltung',
    canActivate: [authGuard],
    loadComponent: () => import("./verwaltung/verwaltung.component").then(m => m.VerwaltungComponent),
  },
  {
    path: 'pdf_template',
    canActivate: [authGuard],
    loadComponent: () => import("./pdf-templates/pdf-templates.component").then(m => m.PdfTemplatesComponent),
  },
  {
    path: 'modul_konfiguration',
    canActivate: [authGuard],
    loadComponent: () => import("./modul-konfiguration/modul-konfiguration.component").then(m => m.ModulKonfigurationComponent),
  },
  {
    path: 'benutzer',
    canActivate: [authGuard],
    loadComponent: () => import("./user/user.component").then(m => m.UserComponent),
  },
  {
    path: 'konfiguration',
    canActivate: [authGuard],
    loadComponent: () => import("./konfiguration/konfiguration.component").then(m => m.KonfigurationComponent),
  },
  {
    path: 'eigene_daten',
    canActivate: [authGuard],
    loadComponent: () => import("./eigene-daten/eigene-daten.component").then(m => m.EigeneDatenComponent),
  },
  {
    path: '**', redirectTo: 'login'
  }
];
