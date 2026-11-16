import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from './prismaClient';
import {
  bindKeycloakSub,
  maakGebruiker,
  telActieveBeheerders,
  vindGebruikerOpEmail,
  wijzigRolEnWisKoppelingen,
  zetKoppelingen,
} from './gebruikersRepository';

beforeAll(async () => {
  await prisma.$connect();
});

afterEach(async () => {
  await prisma.platformInvuller.deleteMany();
  await prisma.gebruiker.deleteMany();
  await prisma.meting.deleteMany();
});

describe('gebruikersRepository', () => {
  it('maakGebruiker slaat e-mail lowercase en getrimd op', async () => {
    const gebruiker = await maakGebruiker({ email: '  Jan.Jansen@Gemeente.NL ', naam: 'Jan', rol: 'invuller' });
    expect(gebruiker.email).toBe('jan.jansen@gemeente.nl');
    expect(gebruiker.status).toBe('uitgenodigd');
    const gevonden = await vindGebruikerOpEmail('JAN.JANSEN@gemeente.nl  ');
    expect(gevonden?.id).toBe(gebruiker.id);
  });

  it('bindKeycloakSub zet status actief en laatsteLogin', async () => {
    const gebruiker = await maakGebruiker({ email: 'a@test.local', naam: 'A', rol: 'invuller' });
    expect(gebruiker.laatsteLogin).toBeNull();
    const gebonden = await bindKeycloakSub(gebruiker.id, 'sub-a');
    expect(gebonden.keycloakSub).toBe('sub-a');
    expect(gebonden.status).toBe('actief');
    expect(gebonden.laatsteLogin).toBeInstanceOf(Date);
  });

  it('keycloakSub is uniek (tweede bind met zelfde sub wordt geweigerd)', async () => {
    const a = await maakGebruiker({ email: 'a@test.local', naam: 'A', rol: 'invuller' });
    const b = await maakGebruiker({ email: 'b@test.local', naam: 'B', rol: 'invuller' });
    await bindKeycloakSub(a.id, 'sub-gedeeld');
    await expect(bindKeycloakSub(b.id, 'sub-gedeeld')).rejects.toThrow();
  });

  it('zetKoppelingen voegt toe en verwijdert per meting, laat andere jaren ongemoeid', async () => {
    const m2027 = await prisma.meting.create({ data: { jaar: 2027 } });
    const m2028 = await prisma.meting.create({ data: { jaar: 2028 } });
    const g = await maakGebruiker({ email: 'k@test.local', naam: 'K', rol: 'invuller' });
    await zetKoppelingen(g.id, m2028.id, ['ro']);

    const eerste = await zetKoppelingen(g.id, m2027.id, ['ro', 'belastingen']);
    if (!eerste.ok) throw new Error('expected ok');
    expect(eerste.toegevoegd.sort()).toEqual(['belastingen', 'ro']);
    expect(eerste.verwijderd).toEqual([]);

    const tweede = await zetKoppelingen(g.id, m2027.id, ['belastingen', 'sociaal-domein']);
    expect(tweede).toEqual({ ok: true, toegevoegd: ['sociaal-domein'], verwijderd: ['ro'] });

    const rijen2027 = await prisma.platformInvuller.findMany({ where: { metingId: m2027.id, gebruiker: g.id } });
    expect(rijen2027.map((r) => r.platformId).sort()).toEqual(['belastingen', 'sociaal-domein']);
    const rijen2028 = await prisma.platformInvuller.findMany({ where: { metingId: m2028.id, gebruiker: g.id } });
    expect(rijen2028.map((r) => r.platformId)).toEqual(['ro']);
  });

  it('should refuse assignments for a lezer under the row lock but allow an empty set', async () => {
    const m2027 = await prisma.meting.create({ data: { jaar: 2027 } });
    const lezer = await maakGebruiker({ email: 'l@test.local', naam: 'L', rol: 'lezer' });

    expect(await zetKoppelingen(lezer.id, m2027.id, ['ro'])).toEqual({ ok: false, reden: 'lezer' });
    expect(await zetKoppelingen(lezer.id, m2027.id, [])).toEqual({ ok: true, toegevoegd: [], verwijderd: [] });
    expect(await prisma.platformInvuller.count()).toBe(0);
  });

  it('should serialize a concurrent role change to lezer and an assignment write', async () => {
    const m2027 = await prisma.meting.create({ data: { jaar: 2027 } });
    const g = await maakGebruiker({ email: 'c@test.local', naam: 'C', rol: 'invuller' });

    // Whichever transaction takes the lock first, the user never ends up as lezer with assignments.
    const [, koppel] = await Promise.all([
      wijzigRolEnWisKoppelingen(g.id, 'lezer', async () => {}),
      zetKoppelingen(g.id, m2027.id, ['ro']),
    ]);

    const rijen = await prisma.platformInvuller.count({ where: { gebruiker: g.id } });
    expect(koppel.ok || rijen === 0).toBe(true);
    expect(rijen).toBe(0);
    expect((await prisma.gebruiker.findUnique({ where: { id: g.id } }))?.rol).toBe('lezer');
  });

  it('should roll back the role change and the removal when the audit callback fails', async () => {
    const m2027 = await prisma.meting.create({ data: { jaar: 2027 } });
    const g = await maakGebruiker({ email: 'r@test.local', naam: 'R', rol: 'invuller' });
    await zetKoppelingen(g.id, m2027.id, ['ro', 'belastingen']);

    const mislukt = wijzigRolEnWisKoppelingen(g.id, 'lezer', async () => {
      throw new Error('audit insert failed');
    });

    await expect(mislukt).rejects.toThrow('audit insert failed');
    expect((await prisma.gebruiker.findUnique({ where: { id: g.id } }))?.rol).toBe('invuller');
    expect(await prisma.platformInvuller.count({ where: { gebruiker: g.id } })).toBe(2);
  });

  it('telActieveBeheerders telt alleen status actief', async () => {
    await maakGebruiker({ email: 'b1@test.local', naam: 'B1', rol: 'beheerder', status: 'actief' });
    await maakGebruiker({ email: 'b2@test.local', naam: 'B2', rol: 'beheerder', status: 'uitgenodigd' });
    await maakGebruiker({ email: 'b3@test.local', naam: 'B3', rol: 'beheerder', status: 'ingetrokken' });
    await maakGebruiker({ email: 'i1@test.local', naam: 'I1', rol: 'invuller', status: 'actief' });
    expect(await telActieveBeheerders()).toBe(1);
  });
});
