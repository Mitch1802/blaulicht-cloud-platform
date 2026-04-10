export interface IJugendAusbildung {
  id: string;
  pkid: number;
  mitglied: number;

  erprobung_lv1?: boolean;
  erprobung_lv1_datum?: string | null;
  erprobung_lv2?: boolean;
  erprobung_lv2_datum?: string | null;
  erprobung_lv3?: boolean;
  erprobung_lv3_datum?: string | null;
  erprobung_lv4?: boolean;
  erprobung_lv4_datum?: string | null;
  erprobung_lv5?: boolean;
  erprobung_lv5_datum?: string | null;

  wissentest_lv1?: boolean;
  wissentest_lv1_datum?: string | null;
  wissentest_lv2?: boolean;
  wissentest_lv2_datum?: string | null;
  wissentest_lv3?: boolean;
  wissentest_lv3_datum?: string | null;
  wissentest_lv4?: boolean;
  wissentest_lv4_datum?: string | null;
  wissentest_lv5?: boolean;
  wissentest_lv5_datum?: string | null;

  fwtechnik_spiel_datum?: string | null;
  fwtechnik_datum?: string | null;
  melder_spiel_datum?: string | null;
  melder_datum?: string | null;
  sicher_zu_wasser_spiel_datum?: string | null;
  sicher_zu_wasser_datum?: string | null;

  created_at?: string;
  updated_at?: string;
}
