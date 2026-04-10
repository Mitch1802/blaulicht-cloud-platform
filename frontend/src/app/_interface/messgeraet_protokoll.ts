export interface IMessgeraetProtokoll {
  id: string;
  geraet_id: number;
  datum: string;
  kalibrierung: boolean;
  kontrolle_woechentlich: boolean;
  wartung_jaehrlich: boolean;
  name_pruefer: string;
  created_at: string;
  updated_at: string;
}

