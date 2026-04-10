import { CheckStatus } from "../fahrzeug/fahrzeug.constants";

export interface IFahrzeugPublic {
  name: string;
  bezeichnung: string;
  beschreibung: string;
  public_id: string;
  service_zuletzt_am?: string | null;
  service_naechstes_am?: string | null;
  foto_url?: string | null;
  raeume: Array<{
    name: string;
    reihenfolge: number;
    foto_url?: string | null;
    items: Array<{
      name: string;
      menge: number;
      einheit: string;
      notiz: string;
      reihenfolge: number;
      wartung_zuletzt_am?: string | null;
      wartung_naechstes_am?: string | null;
    }>;
  }>;
}

export interface IFahrzeugPublicList {
  name: string;
  bezeichnung: string;
  public_id: string;
  foto_url?: string | null;
}

export interface IFahrzeugAuth extends IFahrzeugPublic {
  id: string;
  raeume: Array<{
    id: string;
    name: string;
    reihenfolge: number;
    items: Array<{
      id: string;
      name: string;
      menge: number;
      einheit: string;
      notiz: string;
      reihenfolge: number;
    }>;
  }>;
}

export interface ICheckDraftItem {
  status: CheckStatus;
  menge_aktuel?: number | null;
  notiz?: string;
}

export interface IFahrzeugList {
  id: string;
  name: string;
  bezeichnung: string;
  public_id: string;
  service_zuletzt_am?: string | null;
  service_naechstes_am?: string | null;
  foto_url?: string | null;
}

export interface IRaumItem {
  id: string;
  name: string;
  menge: number;
  einheit: string;
  notiz: string;
  reihenfolge: number;
  wartung_zuletzt_am?: string | null;
  wartung_naechstes_am?: string | null;
}

export interface IFahrzeugRaum {
  id: string;
  name: string;
  reihenfolge: number;
  foto_url?: string | null;
  items: IRaumItem[];
}

export interface IFahrzeugDetail {
  id: string;
  name: string;
  bezeichnung: string;
  beschreibung: string;
  public_id: string;
  service_zuletzt_am?: string | null;
  service_naechstes_am?: string | null;
  foto_url?: string | null;
  raeume: IFahrzeugRaum[];
}

