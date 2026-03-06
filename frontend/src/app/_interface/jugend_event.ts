export interface IJugendEventTeilnehmer {
  id: string;
  pkid: number;
  stbnr: number;
  vorname: string;
  nachname: string;
  dienstgrad?: string;
  level?: number | null;
}

export interface IJugendEvent {
  id: string;
  pkid: number;
  titel: string;
  datum: string;
  ort: string;
  kategorie: string;
  kategorie_label?: string;
  teilnehmer: IJugendEventTeilnehmer[];
}
