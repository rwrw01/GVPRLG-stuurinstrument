import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from './prismaClient';
import { schrijfAudit, zoekAudit } from './auditRepository';

beforeAll(async () => {
  await prisma.$connect();
});

afterEach(async () => {
  await prisma.auditLogEntry.deleteMany();
});

describe('auditRepository', () => {
  it('zoekAudit filtert op platform en jaar via detail', async () => {
    const basis = { actor: 'tester', actie: 'platform_heropend' as const, doelType: 'platform_score', doelId: 'x' };
    await schrijfAudit({ ...basis, detail: 'platform=ro;jaar=2027' });
    await schrijfAudit({ ...basis, detail: 'platform=ro2;jaar=2027' });
    await schrijfAudit({ ...basis, detail: 'platform=ro;jaar=2028' });
    await schrijfAudit({ ...basis, detail: 'platform=belastingen;jaar=2027' });
    await schrijfAudit({ actor: 'ander', actie: 'ingelogd', doelType: 'gebruiker', doelId: 'g1' });

    const roIn2027 = await zoekAudit({ jaar: 2027, platformIds: ['ro'], limiet: 50 });
    expect(roIn2027.map((e) => e.detail)).toEqual(['platform=ro;jaar=2027']);

    const twee = await zoekAudit({ jaar: 2027, platformIds: ['ro', 'belastingen'], limiet: 50 });
    expect(twee.map((e) => e.detail).sort()).toEqual(['platform=belastingen;jaar=2027', 'platform=ro;jaar=2027']);

    const alles2027 = await zoekAudit({ jaar: 2027, limiet: 50 });
    expect(alles2027).toHaveLength(3);

    const perActor = await zoekAudit({ actor: 'ander', actie: 'ingelogd', limiet: 50 });
    expect(perActor).toHaveLength(1);

    const beperkt = await zoekAudit({ limiet: 2 });
    expect(beperkt).toHaveLength(2);
  });

  it('zoekAudit geeft geen regels bij een lege platformlijst', async () => {
    await schrijfAudit({ actor: 'tester', actie: 'platform_heropend', doelType: 'platform_score', doelId: 'x', detail: 'platform=ro;jaar=2027' });
    await schrijfAudit({ actor: 'ander', actie: 'ingelogd', doelType: 'gebruiker', doelId: 'g1' });

    expect(await zoekAudit({ platformIds: [], limiet: 50 })).toEqual([]);
  });
});
