import type { Prisma } from '@prisma/client';

import { schrijfAudit, platformDetail } from '../data/auditRepository';
import {
  inCatalogusTransactie,
  leesRijen,
  maakRij,
  metingIdVanJaar,
  metingStanden,
  openMetingen,
  verwijderKoppelingen,
  wijzigRij,
  type CatalogusRij,
  type CatalogusSoort,
  type CatalogusVelden,
} from '../data/catalogusRepository';
import type { GebruikerRecord } from '../data/gebruikersRepository';
import { geefVrij } from '../data/vragenlijstRepository';
import { fail, ok, type Result } from '../service/result';
import {
  controleerOuder,
  controleerVervallen,
  isFout,
  nieuweKleur,
  nieuweVolgorde,
  nietGevonden,
  OUDER,
  verschil,
  volgendeVolgorde,
  type CatalogusFout,
} from './_catalogusRegels';

export type { CatalogusFout } from './_catalogusRegels';

/** A new item: `naam` is the question text for a question; `ouderId` the axis or platform. */
export interface NieuwItem {
  naam: string;
  ouderId?: string;
  kort?: string;
  nds?: string | null;
}

/** A change; omitted fields stay as they are. `vervallen` removes (true) or restores (false). */
export type ItemWijziging = Pick<CatalogusVelden, 'naam' | 'ouderId' | 'kort' | 'nds' | 'vervallen'>;

type Tx = Prisma.TransactionClient;

async function audit(tx: Tx, actor: GebruikerRecord, actie: 'catalogus_toegevoegd' | 'catalogus_gewijzigd' | 'catalogus_verplaatst', soort: CatalogusSoort, id: string, detail: string) {
  await schrijfAudit({ actor: actor.id, actie, doelType: soort, doelId: id, detail: `soort=${soort};${detail}` }, tx);
}

async function ouderRijen(tx: Tx, soort: CatalogusSoort): Promise<CatalogusRij[]> {
  const ouder = OUDER[soort];
  return ouder ? leesRijen(ouder, tx) : [];
}

/**
 * Adds an axis, question, platform or business unit with a generated key, the next free colour
 * (axes and business units) and the last position among its siblings. Audited with the new value.
 * @param actor - The acting beheerder
 * @param soort - Which list
 * @param invoer - Validated fields
 * @returns the new row, or 404 (unknown parent) / 409 (removed parent, no free colour)
 */
export async function voegToe(actor: GebruikerRecord, soort: CatalogusSoort, invoer: NieuwItem): Promise<Result<CatalogusRij, CatalogusFout>> {
  return inCatalogusTransactie(async (tx) => {
    const rijen = await leesRijen(soort, tx);
    const ouderId = invoer.ouderId ?? null;
    const ouderFout = controleerOuder(soort, (await ouderRijen(tx, soort)).find((o) => o.id === ouderId));
    if (ouderFout) return fail(ouderFout);
    const kleur = nieuweKleur(soort, rijen);
    if (isFout(kleur)) return fail(kleur);
    const rij = await maakRij(tx, soort, {
      ouderId, naam: invoer.naam, kort: invoer.kort ?? null, nds: invoer.nds ?? null, kleur: kleur.kleur, volgorde: volgendeVolgorde(rijen, ouderId),
    });
    await audit(tx, actor, 'catalogus_toegevoegd', soort, rij.id, `nieuw=${JSON.stringify(rij)}`);
    return ok(rij);
  });
}

// The rule checks of a change, in a fixed order; null when the change may go ahead.
async function controleerWijziging(tx: Tx, soort: CatalogusSoort, item: CatalogusRij, rijen: CatalogusRij[], w: ItemWijziging): Promise<CatalogusFout | null> {
  const ouderId = w.ouderId ?? item.ouderId;
  const wordtActief = (w.vervallen ?? item.vervallen) === false;
  if (OUDER[soort] && (ouderId !== item.ouderId || (item.vervallen && wordtActief))) {
    const fout = controleerOuder(soort, (await ouderRijen(tx, soort)).find((o) => o.id === ouderId));
    if (fout) return fout;
  }
  if (w.vervallen === true && !item.vervallen) {
    const kind = soort === 'as' ? 'vraag' : soort === 'platform' ? 'businessunit' : null;
    return controleerVervallen(soort, item, rijen, kind ? await leesRijen(kind, tx) : []);
  }
  return null;
}

// A removed platform no longer takes part in open years: its filler links there go too (audited).
async function ontkoppelOpenJaren(tx: Tx, actor: GebruikerRecord, platformId: string): Promise<void> {
  const open = await openMetingen(tx);
  const jaarVan = new Map(open.map((m) => [m.id, m.jaar]));
  for (const k of await verwijderKoppelingen(tx, platformId, open.map((m) => m.id))) {
    await schrijfAudit({
      actor: actor.id, actie: 'koppeling_verwijderd', doelType: 'platform_invuller', doelId: k.gebruiker,
      detail: `${platformDetail(platformId, jaarVan.get(k.metingId)!)};reden=platform-vervallen`,
    }, tx);
  }
}

/**
 * Changes, moves to another parent, removes or restores an item. Frozen years keep their copy; open
 * years follow at once. Audited with the old and new value of every changed field.
 * @param actor - The acting beheerder
 * @param soort - Which list
 * @param id - Item id
 * @param w - Validated change
 * @returns the updated row, or 404 / 409 with a Dutch message
 */
export async function wijzig(actor: GebruikerRecord, soort: CatalogusSoort, id: string, w: ItemWijziging): Promise<Result<CatalogusRij, CatalogusFout>> {
  return inCatalogusTransactie(async (tx) => {
    const rijen = await leesRijen(soort, tx);
    const item = rijen.find((r) => r.id === id);
    if (!item) return fail(nietGevonden(soort));
    const fout = await controleerWijziging(tx, soort, item, rijen, w);
    if (fout) return fail(fout);
    const nieuweOuder = w.ouderId !== undefined && w.ouderId !== item.ouderId;
    const herstel = w.vervallen === false && item.vervallen;
    // A moved or restored item goes to the end of its siblings, so it never ties with another.
    const volgorde = nieuweOuder || herstel ? volgendeVolgorde(rijen.filter((r) => r.id !== id), w.ouderId ?? item.ouderId) : undefined;
    const nieuw = await wijzigRij(tx, soort, id, { ...w, volgorde });
    const { oud, nieuw: na } = verschil(item, nieuw);
    if (Object.keys(na).length > 0) await audit(tx, actor, 'catalogus_gewijzigd', soort, id, `oud=${JSON.stringify(oud)};nieuw=${JSON.stringify(na)}`);
    if (soort === 'platform' && w.vervallen === true && !item.vervallen) await ontkoppelOpenJaren(tx, actor, id);
    return ok(nieuw);
  });
}

/**
 * Moves an active item one place up or down among its active siblings (axes, questions within
 * their axis, platforms, business units within their platform). Audited.
 * @param actor - The acting beheerder
 * @param soort - Which list
 * @param id - Item id
 * @param richting - `omhoog` or `omlaag`
 * @returns the moved row, or 404 / 409 (removed item, already at the edge)
 */
export async function verplaats(actor: GebruikerRecord, soort: CatalogusSoort, id: string, richting: 'omhoog' | 'omlaag'): Promise<Result<CatalogusRij, CatalogusFout>> {
  return inCatalogusTransactie(async (tx) => {
    const rijen = await leesRijen(soort, tx);
    const item = rijen.find((r) => r.id === id);
    if (!item) return fail(nietGevonden(soort));
    const volgorde = nieuweVolgorde(rijen, item, richting);
    if (isFout(volgorde)) return fail(volgorde);
    let verplaatst = item;
    for (const [i, r] of volgorde.entries()) {
      if (r.volgorde === i) continue;
      const nieuw = await wijzigRij(tx, soort, r.id, { volgorde: i });
      if (r.id === id) verplaatst = nieuw;
    }
    await audit(tx, actor, 'catalogus_verplaatst', soort, id, `richting=${richting};oud=${item.volgorde};nieuw=${verplaatst.volgorde}`);
    return ok(verplaatst);
  });
}

/**
 * Unfreezes the questionnaire of a year that holds nothing that would be lost (§10.2). Audited as
 * `meting_vrijgegeven` in the same transaction.
 * @param actor - The acting beheerder
 * @param jaar - Measurement year
 * @returns ok, or 404 (no meting) / 409 (not frozen, or content present)
 */
export async function geefMetingVrij(actor: GebruikerRecord, jaar: number): Promise<Result<void, CatalogusFout>> {
  const metingId = await metingIdVanJaar(jaar);
  if (!metingId) return fail({ status: 404, detail: `Geen meting voor jaar ${jaar}.` });
  const uitkomst = await geefVrij(metingId, (tx) =>
    schrijfAudit({ actor: actor.id, actie: 'meting_vrijgegeven', doelType: 'meting', doelId: metingId, detail: `jaar=${jaar}` }, tx));
  if (uitkomst === 'niet-vastgelegd') return fail({ status: 409, detail: `De vragenlijst van ${jaar} ligt nog niet vast.` });
  if (uitkomst === 'heeft-inhoud') {
    return fail({ status: 409, detail: `De vragenlijst van ${jaar} blijft vastliggen: er zijn al scores, toelichtingen of aanwezigen opgeslagen.` });
  }
  return ok(undefined);
}

/** The full catalogue (removed items included) and the state of every year. */
export interface Catalogus {
  assen: CatalogusRij[];
  vragen: CatalogusRij[];
  platformen: CatalogusRij[];
  businessUnits: CatalogusRij[];
  metingen: Array<{ jaar: number; vastgelegd: boolean; heeftInhoud: boolean }>;
}

/**
 * Reads the full catalogue for the beheer pages. The caller checks the session.
 * @returns every row of the four lists in order, and per year whether it is frozen
 */
export async function haalCatalogus(): Promise<Catalogus> {
  const [assen, vragen, platformen, businessUnits, metingen] = await Promise.all([
    leesRijen('as'), leesRijen('vraag'), leesRijen('platform'), leesRijen('businessunit'), metingStanden(),
  ]);
  return { assen, vragen, platformen, businessUnits, metingen };
}
