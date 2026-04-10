export interface IMessgeraet {
  pkid: number;
  id: string;
  inv_nr: string;
  bezeichnung: string;
  eigentuemer: string;
  barcode: string;
  standort: string;
  baujahr: string;
  letzte_pruefung?: string;
  naechste_pruefung?: string;
  letzte_kalibrierung?: string;
  naechste_kalibrierung?: string;
  letzte_kontrolle_woechentlich?: string;
  naechste_kontrolle_woechentlich?: string;
  letzte_wartung_jaehrlich?: string;
  naechste_wartung_jaehrlich?: string;
  created_at: string;
  updated_at: string;
}

