export interface IAtemschutzGeraet {
  pkid: number;
  id: string;
  inv_nr: string;
  bezeichnung: string;
  art: string;
  typ: string;
  druckminderer: string;
  lungenautomat: string;
  rahmen_nr: string;
  eigentuemer: string;
  barcode: string;
  standort: string;
  baujahr: string;
  datum_im_dienst: string;
  naechste_gue: string;
  letzte_pruefung?: string;
  naechste_pruefung?: string;
  letzte_pruefung_monatlich?: string;
  naechste_pruefung_monatlich?: string;
  letzte_pruefung_jaehrlich?: string;
  naechste_pruefung_jaehrlich?: string;
  letzte_pruefung_10jahre?: string;
  naechste_pruefung_10jahre?: string;
  created_at: string;
  updated_at: string;
}

