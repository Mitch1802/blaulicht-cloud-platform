export interface IBenutzer {
    id: string,
    username: string,
    name: string,
    first_name: string,
    last_name: string,
    email?: string,
    is_active: boolean,
    password: string,
    roles: any,
    mitglied_id?: number | null
}
