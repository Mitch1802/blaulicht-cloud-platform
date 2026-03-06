export interface IInventar {
  id: string;
  bezeichnung: string;
  anzahl: number | null;
  lagerort: string | null;
  ist_verliehen: boolean;
  verliehen_an: string | null;
  verliehen_bis: string | null;
  notiz: string;
  foto_url?: string | null;
  created_at: string;
  updated_at: string;
}
