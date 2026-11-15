'use client';

import { ItemFormulier, type Veld } from './ItemFormulier';
import { voegToe, wijzig } from './_catalogusApi';
import type { CatBusinessUnit, CatPlatform } from './_catalogusTypen';

const PLATFORM_VELDEN: Veld[] = [{ sleutel: 'naam', label: 'Naam van het platform', soort: 'tekst', verplicht: true }];

function unitVelden(platformen: CatPlatform[]): Veld[] {
  return [
    { sleutel: 'platformId', label: 'Platform', soort: 'keuze', opties: platformen.map((p) => ({ value: p.id, label: p.naam })) },
    { sleutel: 'naam', label: 'Naam van de businessunit', soort: 'tekst', verplicht: true },
  ];
}

/** Props shared by the forms: `klaar` receives the server message (null on success) and returns it. */
interface FormulierProps {
  klaar: (fout: string | null) => string | null;
  onAnnuleren: () => void;
}

/**
 * Form to add a business unit to a platform or to change one (name, platform).
 * @param props.unit - The business unit to change, or null to add
 * @param props.platformId - Platform preselected for a new business unit
 * @param props.platformen - Active platforms to choose from
 * @param props.klaar - Handles the outcome
 * @param props.onAnnuleren - Closes the form
 * @returns the form
 */
export function UnitFormulier({ unit, platformId, platformen, klaar, onAnnuleren }: FormulierProps & { unit: CatBusinessUnit | null; platformId: string; platformen: CatPlatform[] }) {
  return (
    <ItemFormulier titel={unit ? `Businessunit wijzigen: ${unit.naam}` : 'Businessunit toevoegen'} idPrefix={unit ? `unit-${unit.id}` : `nieuwe-unit-${platformId}`}
      velden={unitVelden(platformen)} begin={{ platformId: unit?.platformId ?? platformId, naam: unit?.naam ?? '' }} knop={unit ? 'Wijziging opslaan' : 'Businessunit toevoegen'}
      onAnnuleren={onAnnuleren}
      onOpslaan={async (w) => klaar(unit ? await wijzig('businessunits', unit.id, w) : await voegToe('businessunits', w))} />
  );
}

/**
 * Form to add a platform or rename one.
 * @param props.platform - The platform to rename, or null to add
 * @param props.klaar - Handles the outcome
 * @param props.onAnnuleren - Closes the form
 * @returns the form
 */
export function PlatformFormulier({ platform, klaar, onAnnuleren }: FormulierProps & { platform: CatPlatform | null }) {
  return (
    <ItemFormulier titel={platform ? `Platform wijzigen: ${platform.naam}` : 'Platform toevoegen'} idPrefix={platform ? `platform-${platform.id}` : 'nieuw-platform'}
      velden={PLATFORM_VELDEN} begin={{ naam: platform?.naam ?? '' }} knop={platform ? 'Wijziging opslaan' : 'Platform toevoegen'} onAnnuleren={onAnnuleren}
      onOpslaan={async (w) => klaar(platform ? await wijzig('platformen', platform.id, { naam: w.naam }) : await voegToe('platformen', { naam: w.naam }))} />
  );
}
