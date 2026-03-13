export interface IHomepageDienstposten {
  id?: string;
  pkid?: number;
  section_id: string;
  section_title: string;
  section_order: number;
  position: string;
  position_order: number;
  mitglied_id?: number | null;
  mitglied_name?: string | null;
  photo_url?: string | null;
  fallback_name: string;
  fallback_dienstgrad: string;
  fallback_photo: string;
  fallback_dienstgrad_img: string;
  created_at?: string;
  updated_at?: string;
}

export interface IHomepagePublicMember {
  photo: string;
  name: string;
  dienstgrad: string;
  dienstgrad_img: string;
  position: string;
}

export interface IHomepagePublicSection {
  id: string;
  title: string;
  members: IHomepagePublicMember[];
}

export interface IHomepagePublicResponse {
  sections: IHomepagePublicSection[];
}
