import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from './prismaClient';
import {
  bindKeycloakSub,
  maakGebruiker,
  platformIdsVanGebruiker,
  telActieveBeheerders,
  vindGebruikerOpEmail,
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
    expect(eerste.toegevoegd.sort()).toEqual(['belastingen', 'ro']);
    expect(eerste.verwijderd).toEqual([]);

    const tweede = await zetKoppelingen(g.id, m2027.id, ['belastingen', 'sociaal']);
    expect(tweede.toegevoegd).toEqual(['sociaal']);
    expect(tweede.verwijderd).toEqual(['ro']);

    const rijen2027 = await prisma.platformInvuller.findMany({ where: { metingId: m2027.id, gebruiker: g.id } });
    expect(rijen2027.map((r) => r.platformId).sort()).toEqual(['belastingen', 'sociaal']);
    const rijen2028 = await prisma.platformInvuller.findMany({ where: { metingId: m2028.id, gebruiker: g.id } });
    expect(rijen2028.map((r) => r.platformId)).toEqual(['ro']);
  });

  it('platformIdsVanGebruiker geeft de unieke platformen over alle jaren', async () => {
    const m2027 = await prisma.meting.create({ data: { jaar: 2027 } });
    const m2028 = await prisma.meting.create({ data: { jaar: 2028 } });
    const g = await maakGebruiker({ email: 'p@test.local', naam: 'P', rol: 'invuller' });
    const ander = await maakGebruiker({ email: 'q@test.local', naam: 'Q', rol: 'invuller' });
    await zetKoppelingen(g.id, m2027.id, ['ro', 'belastingen']);
    await zetKoppelingen(g.id, m2028.id, ['ro']);
    await zetKoppelingen(ander.id, m2028.id, ['burgerzaken']);

    expect((await platformIdsVanGebruiker(g.id)).sort()).toEqual(['belastingen', 'ro']);
    expect(await platformIdsVanGebruiker('onbekend')).toEqual([]);
  });

  it('telActieveBeheerders telt alleen status actief', async () => {
    await maakGebruiker({ email: 'b1@test.local', naam: 'B1', rol: 'beheerder', status: 'actief' });
    await maakGebruiker({ email: 'b2@test.local', naam: 'B2', rol: 'beheerder', status: 'uitgenodigd' });
    await maakGebruiker({ email: 'b3@test.local', naam: 'B3', rol: 'beheerder', status: 'ingetrokken' });
    await maakGebruiker({ email: 'i1@test.local', naam: 'I1', rol: 'invuller', status: 'actief' });
    expect(await telActieveBeheerders()).toBe(1);
  });
});
