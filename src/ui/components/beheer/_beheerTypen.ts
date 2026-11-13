/** A user row of `GET /api/beheer/gebruikers` (GebruikerMetKoppelingen in the OpenAPI spec). */
export interface BeheerGebruiker {
  id: string;
  email: string;
  naam: string;
  rol: 'invuller' | 'beheerder';
  status: 'uitgenodigd' | 'actief' | 'ingetrokken';
  gekoppeld: boolean;
  laatsteLogin: string | null;
  platformIds: string[];
}

/** Body of `PATCH /api/beheer/gebruikers/[id]` (GebruikerWijzigen in the OpenAPI spec). */
export type GebruikerWijziging =
  | { actie: 'rol'; rol: 'invuller' | 'beheerder' }
  | { actie: 'intrekken' }
  | { actie: 'herstellen' }
  | { actie: 'ontkoppelAccount' };

/** Audit actions, copied from the AuditActie enum in `api/specs/gvprlg.yaml`. */
export const AUDIT_ACTIES = [
  'gebruiker_toegevoegd',
  'eerste_login',
  'ingelogd',
  'uitgelogd',
  'koppeling_toegevoegd',
  'koppeling_verwijderd',
  'rol_gewijzigd',
  'toegang_ingetrokken',
  'toegang_hersteld',
  'toegang_geweigerd',
  'platform_heropend',
  'account_ontkoppeld',
  'platform_opgeslagen_concept',
  'platform_afgerond',
] as const;

/** A row of `GET /api/audit` (AuditRegel in the OpenAPI spec). */
export interface AuditRegel {
  id: string;
  tijdstip: string;
  actor: string;
  actorNaam: string | null;
  actorEmail: string | null;
  actie: (typeof AUDIT_ACTIES)[number];
  doelType: string;
  doelId: string;
  detail: string;
}
