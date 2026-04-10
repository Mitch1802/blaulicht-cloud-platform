export interface IAtemschutzGeraetProtokoll {
  id: string;
  geraet_id: number;
  datum: string;
  taetigkeit: string;
  verwendung_typ: string;
  verwendung_min: number;
  mitglied_id: number;
  geraet_ok: boolean;
  name_pruefer: string;
  tausch_hochdruckdichtring: boolean;
  tausch_membran: boolean;
  tausch_gleitring: boolean;
  pruefung_10jahre: boolean;
  pruefung_jaehrlich: boolean;
  preufung_monatlich: boolean;
  notiz: string;
  created_at: string;
  updated_at: string;
}

