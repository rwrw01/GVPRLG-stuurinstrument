import { describe, expect, it } from 'vitest';

import { bewerkStappen, lezerBevestiging, sorteerOpNaam, stapVerzoek, vraagtLezerBevestiging, voerStappenUit } from './_gebruikerBewerken';

describe('sorteerOpNaam', () => {
  const lijst = [{ naam: 'bert', email: 'b@x' }, { naam: 'Émile', email: 'e@x' }, { naam: 'Anna', email: 'a@x' }, { naam: 'zoë', email: 'z@x' }];

  it('should sort ascending in Dutch order, ignoring case and accents', () => {
    expect(sorteerOpNaam(lijst, 'oplopend').map((g) => g.naam)).toEqual(['Anna', 'bert', 'Émile', 'zoë']);
  });

  it('should sort descending and leave the input untouched', () => {
    expect(sorteerOpNaam(lijst, 'aflopend').map((g) => g.naam)).toEqual(['zoë', 'Émile', 'bert', 'Anna']);
    expect(lijst[0].naam).toBe('bert');
  });

  it('should order equal names by e-mail so the order is stable', () => {
    const gelijk = [{ naam: 'Jan', email: 'z@x' }, { naam: 'jan', email: 'a@x' }];
    expect(sorteerOpNaam(gelijk, 'oplopend').map((g) => g.email)).toEqual(['a@x', 'z@x']);
  });
});

describe('bewerkStappen', () => {
  it('should send nothing when nothing changed, whatever the link order', () => {
    expect(bewerkStappen({ rol: 'invuller', platformIds: ['a', 'b'] }, { rol: 'invuller', platformIds: ['b', 'a'] })).toEqual([]);
  });

  it('should send only the links when only the links changed', () => {
    expect(bewerkStappen({ rol: 'invuller', platformIds: ['a'] }, { rol: 'invuller', platformIds: [] })).toEqual([
      { soort: 'koppelingen', platformIds: [] },
    ]);
  });

  it('should change the role first and then the links (lezer to invuller)', () => {
    expect(bewerkStappen({ rol: 'lezer', platformIds: [] }, { rol: 'invuller', platformIds: ['a'] })).toEqual([
      { soort: 'rol', rol: 'invuller' },
      { soort: 'koppelingen', platformIds: ['a'] },
    ]);
  });

  it('should never send links for a lezer (the server removes them)', () => {
    expect(bewerkStappen({ rol: 'invuller', platformIds: ['a'] }, { rol: 'lezer', platformIds: ['a', 'b'] })).toEqual([
      { soort: 'rol', rol: 'lezer' },
    ]);
  });
});

describe('vraagtLezerBevestiging', () => {
  it('should ask only when a non-lezer becomes lezer', () => {
    expect(vraagtLezerBevestiging('invuller', 'lezer')).toBe(true);
    expect(vraagtLezerBevestiging('lezer', 'lezer')).toBe(false);
    expect(vraagtLezerBevestiging('lezer', 'invuller')).toBe(false);
  });

  it('should explain that all links in all years are removed', () => {
    expect(lezerBevestiging('Piet')).toBe('Piet wordt lezer. Alle platformkoppelingen in alle meetjaren worden verwijderd. Doorgaan?');
  });
});

describe('stapVerzoek', () => {
  it('should map a role step to the PATCH endpoint and a link step to the PUT endpoint', () => {
    expect(stapVerzoek('u1', 2041, { soort: 'rol', rol: 'beheerder' })).toEqual({
      url: '/api/beheer/gebruikers/u1', method: 'PATCH', body: { actie: 'rol', rol: 'beheerder' },
    });
    expect(stapVerzoek('u1', 2041, { soort: 'koppelingen', platformIds: ['a'] })).toEqual({
      url: '/api/beheer/gebruikers/u1/koppelingen', method: 'PUT', body: { jaar: 2041, platformIds: ['a'] },
    });
  });
});

describe('voerStappenUit', () => {
  const rol = { soort: 'rol', rol: 'invuller' } as const;
  const koppelingen = { soort: 'koppelingen', platformIds: ['a'] } as const;

  it('should run the steps in order and report success', async () => {
    const gezien: string[] = [];
    const melding = await voerStappenUit([rol, koppelingen], async (s) => (gezien.push(s.soort), null));
    expect(melding).toBeNull();
    expect(gezien).toEqual(['rol', 'koppelingen']);
  });

  it('should stop after a failed role change and pass its message on', async () => {
    const gezien: string[] = [];
    const melding = await voerStappenUit([rol, koppelingen], async (s) => (gezien.push(s.soort), 'Geweigerd.'));
    expect(melding).toBe('Geweigerd.');
    expect(gezien).toEqual(['rol']);
  });

  it('should say the role was saved when only the links failed', async () => {
    const melding = await voerStappenUit([rol, koppelingen], async (s) => (s.soort === 'rol' ? null : 'Platform onbekend.'));
    expect(melding).toBe('De rol is gewijzigd, maar de platformkoppelingen zijn niet opgeslagen: Platform onbekend.');
  });

  it('should pass a links-only failure on as is', async () => {
    expect(await voerStappenUit([koppelingen], async () => 'Platform onbekend.')).toBe('Platform onbekend.');
  });
});
