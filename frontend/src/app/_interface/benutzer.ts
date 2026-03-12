export interface IBenutzer {
    id: string,
    username: string,
    name: string,
    email?: string,
    is_active: boolean,
    password: string,
    roles: any,
    mitglied_id?: number | null
}
