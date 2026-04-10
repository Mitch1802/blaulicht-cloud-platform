export interface IATSTraeger {
    id: string,
    mitglied_id: number,
    arzt: string,
    arzt_typ: string,
    letzte_untersuchung: string,
    leistungstest: string,
    leistungstest_art: string,
    naechste_untersuchung?: string,
    tauglichkeit?: string,
    notizen: string,
    fdisk_aenderung: string,
    stbnr?: string,
    vorname?: string,
    nachname?: string,
    geburtsdatum?: string
    hauptberuflich?: boolean
}

