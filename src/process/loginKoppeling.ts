import { z } from 'zod';

import { schrijfAudit } from '../data/auditRepository';
import {
  bindKeycloakSub,
  maakGebruiker,
  registreerLogin,
  telActieveBeheerders,
  vindGebruikerOpEmail,
  vindGebruikerOpSub,
  type GebruikerRecord,
} from '../data/gebruikersRepository';
import { fail, ok, type Result } from '../service/result';

/** Identity claims the app accepts from a verified Keycloak token. */
export const TokenClaimsSchema = z.object({
  sub: z.string().min(1),
  // Trim before the format check so padded addresses from the IdP are accepted and then normalised.
  email: z.string().trim().pipe(z.email()),
  email_verified: z.literal(true),
  name: z.string().optional(),
});

/** Reason a login is refused. */
export type LoginWeigering = 'claims-ongeldig' | 'onbekend' | 'ingetrokken' | 'sub-conflict';

type LoginResultaat = Result<GebruikerRecord, LoginWeigering>;

interface Identiteit {
  sub: string;
  email: string;
  naam: string;
}

function _normaliseer(email: string): string {
  return email.trim().toLowerCase();
}

// Best-effort identification of a refused login from claims that may not have passed validation.
function _ruweIdentiteit(claims: unknown): { actor: string; email: string } {
  const ruw = typeof claims === 'object' && claims !== null ? (claims as Record<string, unknown>) : {};
  const actor = typeof ruw.sub === 'string' && ruw.sub.length > 0 ? ruw.sub : 'onbekend';
  const email = z.email().safeParse(typeof ruw.email === 'string' ? _normaliseer(ruw.email) : undefined);
  return { actor, email: email.success ? email.data : 'onbekend' };
}

async function _weiger(reden: LoginWeigering, actor: string, email: string): Promise<LoginResultaat> {
  await schrijfAudit({
    actor,
    actie: 'toegang_geweigerd',
    doelType: 'login',
    doelId: email,
    detail: `reden=${reden};email=${email}`,
  });
  return fail(reden);
}

async function _auditSucces(
  actie: 'ingelogd' | 'eerste_login',
  gebruiker: GebruikerRecord,
  detail: string,
): Promise<LoginResultaat> {
  await schrijfAudit({ actor: gebruiker.id, actie, doelType: 'gebruiker', doelId: gebruiker.id, detail });
  return ok(gebruiker);
}

async function _loginBestaandeSub(gebruiker: GebruikerRecord, id: Identiteit): Promise<LoginResultaat> {
  if (gebruiker.status === 'ingetrokken') return _weiger('ingetrokken', id.sub, id.email);
  await registreerLogin(gebruiker.id);
  return _auditSucces('ingelogd', gebruiker, `email=${id.email}`);
}

async function _bindOpEmail(gebruiker: GebruikerRecord, id: Identiteit): Promise<LoginResultaat> {
  if (gebruiker.keycloakSub !== null) return _weiger('sub-conflict', id.sub, id.email);
  if (gebruiker.status === 'ingetrokken') return _weiger('ingetrokken', id.sub, id.email);
  const gebonden = await bindKeycloakSub(gebruiker.id, id.sub);
  return _auditSucces('eerste_login', gebonden, `email=${id.email}`);
}

async function _bootstrap(id: Identiteit, bootstrapEmail: string): Promise<LoginResultaat> {
  const isBootstrap = id.email === _normaliseer(bootstrapEmail) && (await telActieveBeheerders()) === 0;
  if (!isBootstrap) return _weiger('onbekend', id.sub, id.email);
  const nieuw = await maakGebruiker({ email: id.email, naam: id.naam, rol: 'beheerder' });
  const gebonden = await bindKeycloakSub(nieuw.id, id.sub);
  return _auditSucces('eerste_login', gebonden, `email=${id.email};bootstrap`);
}

/**
 * Maps verified Keycloak token claims to an app user, binding the Keycloak subject on first login.
 * Every refusal is audited as `toegang_geweigerd`; every success as `ingelogd` or `eerste_login`.
 * @param claims - Raw token claims (validated with `TokenClaimsSchema`)
 * @param bootstrapEmail - E-mail allowed to become the first administrator while none is active
 * @returns The logged-in user, or the reason the login is refused
 */
export async function koppelLogin(claims: unknown, bootstrapEmail: string): Promise<LoginResultaat> {
  const parsed = TokenClaimsSchema.safeParse(claims);
  if (!parsed.success) {
    const ruw = _ruweIdentiteit(claims);
    return _weiger('claims-ongeldig', ruw.actor, ruw.email);
  }
  const email = _normaliseer(parsed.data.email);
  const id: Identiteit = { sub: parsed.data.sub, email, naam: parsed.data.name ?? email };

  const opSub = await vindGebruikerOpSub(id.sub);
  if (opSub) return _loginBestaandeSub(opSub, id);
  const opEmail = await vindGebruikerOpEmail(id.email);
  if (opEmail) return _bindOpEmail(opEmail, id);
  return _bootstrap(id, bootstrapEmail);
}
