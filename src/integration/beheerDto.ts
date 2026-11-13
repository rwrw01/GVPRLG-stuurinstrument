import type { NextResponse } from 'next/server';

import type { GebruikerRecord, GebruikerStatus, Rol } from '../data/gebruikersRepository';
import { problemResponse } from './problemResponse';

/** A user as exposed by the admin API; the Keycloak subject itself is never exposed. */
export interface GebruikerDto {
  id: string;
  email: string;
  naam: string;
  rol: Rol;
  status: GebruikerStatus;
  gekoppeld: boolean;
  laatsteLogin: Date | null;
}

/** Errors the admin workflow can return. */
export type BeheerFout = 'bestaat-al' | 'meting-onbekend' | 'niet-gevonden' | 'zelfbescherming' | 'laatste-beheerder';

const FOUTEN: Record<BeheerFout, { status: number; title: string; detail: string }> = {
  'bestaat-al': { status: 409, title: 'Gebruiker bestaat al', detail: 'Er bestaat al een gebruiker met dit e-mailadres.' },
  'meting-onbekend': { status: 404, title: 'Meting niet gevonden', detail: 'Er is geen meting voor dit jaar.' },
  'niet-gevonden': { status: 404, title: 'Gebruiker niet gevonden', detail: 'Deze gebruiker bestaat niet.' },
  zelfbescherming: {
    status: 409,
    title: 'Niet toegestaan voor uzelf',
    detail: 'U kunt uw eigen beheerrol niet intrekken of verlagen.',
  },
  'laatste-beheerder': {
    status: 409,
    title: 'Laatste beheerder',
    detail: 'Er moet minstens één actieve beheerder overblijven.',
  },
};

/**
 * Maps a user record to the API shape without the Keycloak subject.
 * @param gebruiker - User record
 * @returns The user with `gekoppeld` instead of `keycloakSub`
 */
export function naarGebruikerDto(gebruiker: GebruikerRecord): GebruikerDto {
  return {
    id: gebruiker.id,
    email: gebruiker.email,
    naam: gebruiker.naam,
    rol: gebruiker.rol,
    status: gebruiker.status,
    gekoppeld: gebruiker.keycloakSub !== null,
    laatsteLogin: gebruiker.laatsteLogin,
  };
}

/**
 * Maps an admin workflow error to a problem+json response (409 or 404).
 * @param fout - Workflow error
 * @returns The problem+json response
 */
export function beheerFoutResponse(fout: BeheerFout): NextResponse {
  const { status, title, detail } = FOUTEN[fout];
  return problemResponse(status, title, detail);
}
