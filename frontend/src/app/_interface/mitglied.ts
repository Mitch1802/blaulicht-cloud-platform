export interface IMitglied {
    id: string,
    pkid: number,
    stbnr: number,
    vorname: string,
    nachname: string,
    svnr: string,
    geburtsdatum: string,
    hauptberuflich: boolean,
    dienststatus?: 'JUGEND' | 'AKTIV',
    aktiv_ueberstellt_am?: string,
    jugend_wissentest?: boolean,
    jugend_erprobung?: string,
    jugend_fertigkeitsabzeichen?: string,
    jugend_bewerb?: string
}
