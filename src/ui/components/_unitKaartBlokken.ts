import type { UiBusinessUnit, UiPlatform, UiVragenlijst } from './_vragenlijstTypen';

/** One block on the year page: a lone business unit card, or a platform with several units. */
export type UnitKaartBlok = { soort: 'enkel'; unit: UiBusinessUnit } | { soort: 'groep'; platform: UiPlatform; units: UiBusinessUnit[] };

/**
 * The business unit cards of a year in the configured platform order. A platform with one
 * business unit gives a single card; a platform with more stays in place as a group.
 * @param lijst - Questionnaire of the year
 * @returns the blocks in platform order; platforms without known units are skipped
 */
export function unitKaartBlokken(lijst: UiVragenlijst): UnitKaartBlok[] {
  const perId = new Map(lijst.businessUnits.map((b) => [b.id, b]));
  return lijst.platformen.flatMap((platform): UnitKaartBlok[] => {
    const units = platform.businessUnitIds.flatMap((id) => perId.get(id) ?? []);
    if (units.length === 0) return [];
    if (units.length === 1) return [{ soort: 'enkel', unit: units[0]! }];
    return [{ soort: 'groep', platform, units }];
  });
}
