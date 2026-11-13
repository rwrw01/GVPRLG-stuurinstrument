import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '../data/prismaClient';
import { bindKeycloakSub, maakGebruiker, vindGebruikerOpEmail, wijzigGebruiker } from '../data/gebruikersRepository';
import { koppelLogin } from './loginKoppeling';

const BOOTSTRAP = 'beheer@test.local';

function claims(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { sub: 'sub-1', email: 'jan@test.local', email_verified: true, name: 'Jan', ...overrides };
}

async function auditRegels(actie: string) {
  return prisma.auditLogEntry.findMany({ where: { actie }, orderBy: { tijdstip: 'asc' } });
}

beforeAll(async () => {
  await prisma.$connect();
});

afterEach(async () => {
  await prisma.auditLogEntry.deleteMany();
  await prisma.platformInvuller.deleteMany();
  await prisma.gebruiker.deleteMany();
});

describe('koppelLogin', () => {
  it('bindt de sub bij de eerste login op e-mail', async () => {
    const uitgenodigd = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller' });

    const eerste = await koppelLogin(claims(), BOOTSTRAP);
    expect(eerste).toMatchObject({ ok: true, data: { id: uitgenodigd.id, keycloakSub: 'sub-1', status: 'actief' } });
    const eersteLogin = await auditRegels('eerste_login');
    expect(eersteLogin).toHaveLength(1);
    expect(eersteLogin[0]).toMatchObject({
      actor: uitgenodigd.id,
      doelType: 'gebruiker',
      doelId: uitgenodigd.id,
      detail: 'email=jan@test.local',
    });

    const tweede = await koppelLogin(claims(), BOOTSTRAP);
    expect(tweede).toMatchObject({ ok: true, data: { id: uitgenodigd.id } });
    const ingelogd = await auditRegels('ingelogd');
    expect(ingelogd).toHaveLength(1);
    expect(ingelogd[0]).toMatchObject({ actor: uitgenodigd.id, doelId: uitgenodigd.id, detail: 'email=jan@test.local' });
  });

  it('normaliseert e-mail uit het token (hoofdletters, spaties)', async () => {
    const uitgenodigd = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller' });

    const resultaat = await koppelLogin(claims({ email: '  JAN@Test.Local ' }), BOOTSTRAP);
    expect(resultaat).toMatchObject({ ok: true, data: { id: uitgenodigd.id, keycloakSub: 'sub-1' } });
    const [regel] = await auditRegels('eerste_login');
    expect(regel?.detail).toBe('email=jan@test.local');
  });

  it('weigert ongeverifieerde e-mail', async () => {
    await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller' });

    const resultaat = await koppelLogin(claims({ email_verified: false }), BOOTSTRAP);
    expect(resultaat).toEqual({ ok: false, error: 'claims-ongeldig' });
    const gebruiker = await vindGebruikerOpEmail('jan@test.local');
    expect(gebruiker?.keycloakSub).toBeNull();
  });

  it('weigert een onbekend e-mailadres', async () => {
    const resultaat = await koppelLogin(claims({ email: 'vreemd@test.local' }), BOOTSTRAP);
    expect(resultaat).toEqual({ ok: false, error: 'onbekend' });
    expect(await prisma.gebruiker.count()).toBe(0);
  });

  it('weigert een ingetrokken gebruiker', async () => {
    const opEmail = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller', status: 'ingetrokken' });
    expect(await koppelLogin(claims(), BOOTSTRAP)).toEqual({ ok: false, error: 'ingetrokken' });
    expect((await vindGebruikerOpEmail(opEmail.email))?.keycloakSub).toBeNull();

    const opSub = await maakGebruiker({ email: 'piet@test.local', naam: 'Piet', rol: 'invuller' });
    await bindKeycloakSub(opSub.id, 'sub-piet');
    await wijzigGebruiker(opSub.id, { status: 'ingetrokken' });
    const resultaat = await koppelLogin(claims({ sub: 'sub-piet', email: 'piet@test.local' }), BOOTSTRAP);
    expect(resultaat).toEqual({ ok: false, error: 'ingetrokken' });
  });

  it('weigert e-mail die aan andere sub gebonden is', async () => {
    const gebruiker = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller' });
    await bindKeycloakSub(gebruiker.id, 'sub-origineel');

    const resultaat = await koppelLogin(claims({ sub: 'sub-indringer' }), BOOTSTRAP);
    expect(resultaat).toEqual({ ok: false, error: 'sub-conflict' });
    expect((await vindGebruikerOpEmail('jan@test.local'))?.keycloakSub).toBe('sub-origineel');
  });

  it('maakt de bootstrap-beheerder alleen als er nog geen actieve beheerder is', async () => {
    const eerste = await koppelLogin(claims({ sub: 'sub-beheer', email: ' Beheer@Test.Local', name: undefined }), BOOTSTRAP);
    expect(eerste).toMatchObject({
      ok: true,
      data: { email: BOOTSTRAP, naam: BOOTSTRAP, rol: 'beheerder', status: 'actief', keycloakSub: 'sub-beheer' },
    });
    const [regel] = await auditRegels('eerste_login');
    expect(regel?.detail).toBe(`email=${BOOTSTRAP};bootstrap`);

    await prisma.gebruiker.deleteMany({ where: { email: BOOTSTRAP } });
    await maakGebruiker({ email: 'baas@test.local', naam: 'Baas', rol: 'beheerder', status: 'actief' });
    const tweede = await koppelLogin(claims({ sub: 'sub-ander', email: BOOTSTRAP }), BOOTSTRAP);
    expect(tweede).toEqual({ ok: false, error: 'onbekend' });
    expect(await vindGebruikerOpEmail(BOOTSTRAP)).toBeNull();
  });

  it('schrijft toegang_geweigerd bij elke weigering', async () => {
    const ingetrokken = await maakGebruiker({ email: 'weg@test.local', naam: 'Weg', rol: 'invuller', status: 'ingetrokken' });
    const gebonden = await maakGebruiker({ email: 'bezet@test.local', naam: 'Bezet', rol: 'invuller' });
    await bindKeycloakSub(gebonden.id, 'sub-bezet');

    await koppelLogin({ email_verified: true }, BOOTSTRAP);
    await koppelLogin(claims({ sub: 'sub-x', email: 'NIEMAND@test.local' }), BOOTSTRAP);
    await koppelLogin(claims({ sub: 'sub-y', email: ingetrokken.email }), BOOTSTRAP);
    await koppelLogin(claims({ sub: 'sub-z', email: gebonden.email }), BOOTSTRAP);

    const regels = await auditRegels('toegang_geweigerd');
    expect(regels).toHaveLength(4);
    const vereenvoudigd = regels.map((r) => ({ actor: r.actor, doelType: r.doelType, doelId: r.doelId, detail: r.detail }));
    expect(vereenvoudigd).toEqual(expect.arrayContaining([
      { actor: 'onbekend', doelType: 'login', doelId: 'onbekend', detail: 'reden=claims-ongeldig;email=onbekend' },
      { actor: 'sub-x', doelType: 'login', doelId: 'niemand@test.local', detail: 'reden=onbekend;email=niemand@test.local' },
      { actor: 'sub-y', doelType: 'login', doelId: 'weg@test.local', detail: 'reden=ingetrokken;email=weg@test.local' },
      { actor: 'sub-z', doelType: 'login', doelId: 'bezet@test.local', detail: 'reden=sub-conflict;email=bezet@test.local' },
    ]));
  });
});
