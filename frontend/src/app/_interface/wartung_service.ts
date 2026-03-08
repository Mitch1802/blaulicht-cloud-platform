export type TWartungServiceStatus = 'ueberfaellig' | 'heute' | 'anstehend';

export interface IWartungServiceEintrag {
  modul: string;
  bereich: string;
  eintrag: string;
  intervall: string;
  faelligkeit: string;
  status: TWartungServiceStatus;
  link: string;
}

export interface IWartungServiceSummary {
  gesamt: number;
  ueberfaellig: number;
  heute: number;
  anstehend: number;
}

export interface IWartungServiceResponse {
  jahr: number;
  heute: string;
  summary: IWartungServiceSummary;
  main: IWartungServiceEintrag[];
}
