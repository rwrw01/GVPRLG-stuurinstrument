import { describe, expect, it, vi } from 'vitest';

import type { BeheerGebruiker } from './_beheerTypen';
import { maakBeheerActies, type LaadResultaat } from './_beheerActies';

function gebruiker(over: Partial<BeheerGebruiker> = {}): BeheerGebruiker {
  return {
    id: 'u1', email: 'u1@test.local', naam: 'U1', rol: 'invuller', status: 'actief', gekoppeld: true, laatsteLogin: null, platformIds: [], ...over,
  };
}

// A fetch that the test resolves by hand, so it can switch the year while the answer is in flight.
function uitgesteld() {
  let los: (r: LaadResultaat) => void = () => undefined;
  const belofte = new Promise<LaadResultaat>((resolve) => {
    los = resolve;
  });
  return { belofte, los };
}

function opzet(startJaar: number) {
  const staat = { jaar: startJaar };
  const deps = {
    actueelJaar: () => staat.jaar,
    haal: vi.fn<(jaar: number) => Promise<LaadResultaat>>(async () => ({ ok: true, gebruikers: [gebruiker()] })),
    verstuur: vi.fn<(url: string, method: 'PATCH' | 'PUT', body: unknown) => Promise<string | null>>(async () => null),
    zetGebruikers: vi.fn<(jaar: number, gebruikers: BeheerGebruiker[]) => void>(),
    zetFout: vi.fn<(melding: string | null) => void>(),
  };
  return { staat, deps, acties: maakBeheerActies(deps) };
}

describe('maakBeheerActies.laad', () => {
  it('should apply the answer when the year is still chosen', async () => {
    const { deps, acties } = opzet(2041);
    await acties.laad(2041);
    expect(deps.zetGebruikers).toHaveBeenCalledWith(2041, [gebruiker()]);
  });

  it('should drop a late answer for a year that is no longer chosen', async () => {
    const { staat, deps, acties } = opzet(2041);
    const antwoord = uitgesteld();
    deps.haal.mockReturnValueOnce(antwoord.belofte);
    const bezig = acties.laad(2041);
    staat.jaar = 2042;
    antwoord.los({ ok: false, melding: 'Kon de gebruikers niet laden.' });
    await bezig;
    expect(deps.zetGebruikers).not.toHaveBeenCalled();
    expect(deps.zetFout).not.toHaveBeenCalled();
  });
});

describe('maakBeheerActies after a mutation', () => {
  it('should drop the reload for the old year when the year changed during an access action', async () => {
    const { staat, deps, acties } = opzet(2041);
    const antwoord = uitgesteld();
    deps.haal.mockReturnValueOnce(antwoord.belofte);
    const bezig = acties.wijzig(2041, 'u1', { actie: 'intrekken' });
    await vi.waitFor(() => expect(deps.haal).toHaveBeenCalledWith(2041));
    staat.jaar = 2042;
    antwoord.los({ ok: true, gebruikers: [gebruiker({ platformIds: ['oud-jaar'] })] });
    await bezig;
    expect(deps.verstuur).toHaveBeenCalledWith('/api/beheer/gebruikers/u1', 'PATCH', { actie: 'intrekken' });
    expect(deps.zetGebruikers).not.toHaveBeenCalled();
  });

  it('should drop the reload for the old year when the year changed during a save', async () => {
    const { staat, deps, acties } = opzet(2041);
    const antwoord = uitgesteld();
    deps.haal.mockReturnValueOnce(antwoord.belofte);
    const bezig = acties.slaOp(2041, gebruiker(), { rol: 'invuller', platformIds: ['a'] });
    await vi.waitFor(() => expect(deps.haal).toHaveBeenCalledWith(2041));
    staat.jaar = 2042;
    antwoord.los({ ok: true, gebruikers: [gebruiker({ platformIds: ['a'] })] });
    expect(await bezig).toBeNull();
    expect(deps.zetGebruikers).not.toHaveBeenCalled();
  });

  it('should keep a save error visible on the page when the year changed meanwhile', async () => {
    const { staat, deps, acties } = opzet(2041);
    deps.verstuur.mockImplementationOnce(async () => {
      staat.jaar = 2042;
      return 'Geweigerd.';
    });
    expect(await acties.slaOp(2041, gebruiker(), { rol: 'beheerder', platformIds: [] })).toBe('Geweigerd.');
    expect(deps.zetFout).toHaveBeenLastCalledWith('Geweigerd.');
  });
});

describe('maakBeheerActies.slaOp', () => {
  it('should save a beheerder with links: PATCH the role, then PUT the year links', async () => {
    const { deps, acties } = opzet(2041);
    const melding = await acties.slaOp(2041, gebruiker({ platformIds: ['a'] }), { rol: 'beheerder', platformIds: ['a', 'b'] });
    expect(melding).toBeNull();
    expect(deps.verstuur.mock.calls).toEqual([
      ['/api/beheer/gebruikers/u1', 'PATCH', { actie: 'rol', rol: 'beheerder' }],
      ['/api/beheer/gebruikers/u1/koppelingen', 'PUT', { jaar: 2041, platformIds: ['a', 'b'] }],
    ]);
    expect(deps.zetGebruikers).toHaveBeenCalledWith(2041, [gebruiker()]);
  });

  it('should report a partial failure (role saved, links refused) and still reload', async () => {
    const { deps, acties } = opzet(2041);
    deps.verstuur.mockImplementation(async (_url, method) => (method === 'PUT' ? 'Platform onbekend.' : null));
    const melding = await acties.slaOp(2041, gebruiker(), { rol: 'beheerder', platformIds: ['x'] });
    expect(melding).toBe('De rol is gewijzigd, maar de platformkoppelingen zijn niet opgeslagen: Platform onbekend.');
    expect(deps.haal).toHaveBeenCalledWith(2041);
    expect(deps.zetFout).not.toHaveBeenCalledWith(melding);
  });

  it('should send nothing when nothing changed', async () => {
    const { deps, acties } = opzet(2041);
    expect(await acties.slaOp(2041, gebruiker({ platformIds: ['a'] }), { rol: 'invuller', platformIds: ['a'] })).toBeNull();
    expect(deps.verstuur).not.toHaveBeenCalled();
  });
});
