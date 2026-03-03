export interface IJugendEventTeilnehmer {
  id: string;
  pkid: number;
  stbnr: number;
  vorname: string;
  nachname: string;
}

export interface IJugendEvent {
  id: string;
  pkid: number;
  titel: string;
  datum: string;
  ort: string;
  teilnehmer: IJugendEventTeilnehmer[];
}
