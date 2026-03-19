export type BenutzerRolle = string | { key?: string; id?: number | string; verbose_name?: string }

export interface IBenutzer {
    id: string,
    username: string,
    name: string,
    email?: string,
    is_active: boolean,
    password: string,
    roles: BenutzerRolle[] | string,
    mitglied_id?: number | null
}
