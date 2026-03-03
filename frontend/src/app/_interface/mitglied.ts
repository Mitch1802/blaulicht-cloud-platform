export interface IMitglied {
    id: string,
    pkid: number,
    stbnr: number,
    vorname: string,
    nachname: string,
    dienstgrad?: string,
    svnr: string,
    geburtsdatum: string,
    hauptberuflich: boolean,
    dienststatus?: 'JUGEND' | 'AKTIV' | 'RESERVE' | 'ABGEMELDET',
    jugend_wissentest?: string,
    jugend_erprobung?: string,
    jugend_fertigkeitsabzeichen?: string,
    jugend_bewerb?: string
}
