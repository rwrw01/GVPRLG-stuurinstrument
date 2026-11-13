import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../data/prismaClient';
import { createMeting } from '../data/metingenRepository';
import { maakGebruiker, zetKoppelingen, type GebruikerRecord } from '../data/gebruikersRepository';
import { beperkAuditFilterTotGebruiker } from './auditToegang';

let beheerder: GebruikerRecord;
let jan: GebruikerRecord;

beforeEach(async () => {
  beheerder = await maakGebruiker({ email: 'bea@test.local', naam: 'Bea', rol: 'beheerder', status: 'actief' });
  jan = await maakGebruiker({ email: 'jan@test.local', naam: 'Jan', rol: 'invuller', status: 'actief' });
});

afterEach(async () => {
  await prisma.platformInvuller.deleteMany();
  await prisma.meting.deleteMany();
  await prisma.gebruiker.deleteMany();
});

describe('beperkAuditFilterTotGebruiker', () => {
  it('should leave the filter unchanged for a beheerder', async () => {
    const filter = await beperkAuditFilterTotGebruiker(beheerder, {
      jaar: 2026,
      platformId: 'ro',
      actor: 'x',
      actie: 'ingelogd',
      limiet: 50,
    });

    expect(filter).toEqual({ jaar: 2026, platformIds: ['ro'], actor: 'x', actie: 'ingelogd', limiet: 50 });
    expect(await beperkAuditFilterTotGebruiker(beheerder, { limiet: 200 })).toEqual({
      limiet: 200,
      actor: undefined,
      platformIds: undefined,
    });
  });

  it('should force an invuller to his own platforms and drop actor', async () => {
    const meting = await createMeting(2026);
    await zetKoppelingen(jan.id, meting.id, ['ro', 'belastingen']);

    const filter = await beperkAuditFilterTotGebruiker(jan, { actor: beheerder.id, limiet: 200 });

    expect(filter.actor).toBeUndefined();
    expect([...(filter.platformIds ?? [])].sort()).toEqual(['belastingen', 'ro']);
  });

  it('should keep an own platformId and ignore a foreign one for an invuller', async () => {
    const meting = await createMeting(2026);
    await zetKoppelingen(jan.id, meting.id, ['ro']);

    expect((await beperkAuditFilterTotGebruiker(jan, { platformId: 'ro', limiet: 200 })).platformIds).toEqual(['ro']);
    expect((await beperkAuditFilterTotGebruiker(jan, { platformId: 'belastingen', limiet: 200 })).platformIds).toEqual([
      'ro',
    ]);
  });

  it('should yield platformIds [] for an invuller without assignments', async () => {
    expect(await beperkAuditFilterTotGebruiker(jan, { platformId: 'ro', limiet: 200 })).toEqual({
      limiet: 200,
      platformIds: [],
    });
  });
});
