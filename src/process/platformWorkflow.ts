import { bewaarBusinessUnitScore, type OpslagContext } from '../data/metingenRepository';
import type { LijstBusinessUnit } from '../data/vragenlijstRepository';
import { fail, ok, type Result } from '../service/result';
import type { AssenLijst } from '../service/scores';

export interface VraagScoreCheck {
  vraagId: string;
  score: number | null;
}

/** A refused save with the HTTP status and the Dutch title and detail to show. */
export interface OpslagFout {
  status: 400 | 409 | 422;
  titel: string;
  detail: string;
}

/** What an invuller or beheerder sends for one business unit. */
export interface BusinessUnitInvoer {
  status: 'concept' | 'definitief';
  algemeneToelichting: string;
  aanwezigen: string;
  vraagScores: Array<{ vraagId: string; score: number | null; toelichting: string }>;
}

/**
 * Checks that every question of the year's list has a score before finalising.
 * @param lijst - Questionnaire of the year
 * @param vraagScores - Submitted scores
 * @returns a Dutch message naming the missing questions, or null when complete
 */
export function valideerVoorAfronden(lijst: AssenLijst, vraagScores: VraagScoreCheck[]): string | null {
  const alleVraagIds = lijst.assen.flatMap((a) => a.vragen.map((v) => v.id));
  const ingevuld = new Map(vraagScores.map((v) => [v.vraagId, v.score]));
  const ontbrekend = alleVraagIds.filter((id) => ingevuld.get(id) == null);
  if (ontbrekend.length > 0) {
    return `Vul alle vragen in voordat u afrondt. Ontbrekend: ${ontbrekend.join(', ')}.`;
  }
  return null;
}

/**
 * The checks of one save against the list of the moment of saving, in a fixed order.
 * @param unit - The business unit as the caller resolved it (its platform decided the access check)
 * @param invoer - Submitted row
 * @param context - Year list and current status inside the save transaction
 * @returns the refusal, or null when the save may go ahead
 */
export function controleerOpslag(unit: LijstBusinessUnit, invoer: BusinessUnitInvoer, context: OpslagContext): OpslagFout | null {
  const { lijst, huidigeStatus } = context;
  const nu = lijst.businessUnits.find((b) => b.id === unit.id);
  if (!nu || nu.platformId !== unit.platformId) {
    return { status: 409, titel: 'Vragenlijst gewijzigd', detail: 'De indeling van deze businessunit is net gewijzigd. Laad de pagina opnieuw.' };
  }
  if (huidigeStatus === 'definitief') {
    return { status: 409, titel: 'Businessunit is al definitief', detail: `${unit.naam} is al afgerond voor ${lijst.jaar}. Een beheerder moet dit eerst heropenen.` };
  }
  const bekend = new Set(lijst.assen.flatMap((a) => a.vragen.map((v) => v.id)));
  if (invoer.vraagScores.some((v) => !bekend.has(v.vraagId))) {
    return { status: 400, titel: 'Ongeldige invoer', detail: `Deze vraag hoort niet bij de vragenlijst van ${lijst.jaar}.` };
  }
  const onvolledig = invoer.status === 'definitief' ? valideerVoorAfronden(lijst, invoer.vraagScores) : null;
  return onvolledig ? { status: 422, titel: 'Kan niet afronden', detail: onvolledig } : null;
}

/**
 * Saves one business unit row as concept or definitief. Freezes the year in the same transaction
 * (also for a concept without scores) and validates the question ids against the list at the
 * moment of saving, so a catalogue change while the form was open cannot slip in. The caller
 * has checked write access for the unit's platform.
 * @param gebruiker - Acting user (id and e-mail for the row and the audit)
 * @param meting - Meting id and year
 * @param unit - The business unit of that year
 * @param invoer - Validated body
 * @returns ok, or the refusal with status and Dutch message
 */
export async function slaBusinessUnitOp(
  gebruiker: { id: string; email: string },
  meting: { id: string; jaar: number },
  unit: LijstBusinessUnit,
  invoer: BusinessUnitInvoer,
): Promise<Result<void, OpslagFout>> {
  const resultaat = await bewaarBusinessUnitScore(
    { ...invoer, metingId: meting.id, jaar: meting.jaar, businessUnitId: unit.id, laatstGewijzigdDoor: gebruiker.id, actorEmail: gebruiker.email },
    (context) => controleerOpslag(unit, invoer, context),
  );
  if (resultaat.ok) return ok(undefined);
  if (resultaat.fout === 'te-weinig-vragen') {
    return fail({ status: 409, titel: 'Vragenlijst onvolledig', detail: 'De vragenlijst heeft minder dan 3 vragen. Een meetjaar kan pas worden vastgelegd met minstens 3 vragen.' });
  }
  return fail(resultaat.fout);
}
