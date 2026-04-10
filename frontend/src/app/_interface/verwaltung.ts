export interface IRechnung {
  adress_name: string;
  adresse_strasse: string;
  adresse_plz: string;
  adresse_ort: string;
  betreff: string;
  anrede: string;
  text: string;
  positionen: Array<{
    bezeichnung: string;
    preis: number;
  }>;
}
