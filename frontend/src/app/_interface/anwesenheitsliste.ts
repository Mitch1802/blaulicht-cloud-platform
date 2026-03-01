export interface IAnwesenheitsliste {
  id?: string;
  mitglied_ids?: number[];
  titel: string;
  datum?: string;
  ort?: string;
  notiz?: string;
  mitglieder_anzeige?: string;
  created_at?: string;
  updated_at?: string;
}
