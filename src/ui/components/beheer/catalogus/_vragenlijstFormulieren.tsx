'use client';

import { CONFIG } from '@/src/service/config';

import { ItemFormulier, type Veld } from './ItemFormulier';
import { voegToe, wijzig } from './_catalogusApi';
import type { CatAs, CatVraag } from './_catalogusTypen';

const NDS_OPTIES = [{ value: '', label: 'Geen' }, ...CONFIG.ndsThemas.map((t) => ({ value: t.id, label: t.id }))];
const AS_VELDEN: Veld[] = [{ sleutel: 'naam', label: 'Naam van de as', soort: 'tekst', verplicht: true }];

function vraagVelden(assen: CatAs[]): Veld[] {
  return [
    { sleutel: 'asId', label: 'As', soort: 'keuze', opties: assen.map((a) => ({ value: a.id, label: a.naam })) },
    { sleutel: 'kort', label: 'Kort label', soort: 'tekst', maxLength: 22, hint: 'Maximaal 22 tekens; staat bij de spaak in het spinnenweb.', verplicht: true },
    { sleutel: 'tekst', label: 'Vraagtekst', soort: 'lang', verplicht: true },
    { sleutel: 'nds', label: 'NDS-thema', soort: 'keuze', opties: NDS_OPTIES },
  ];
}

/** Props shared by the forms: `klaar` receives the server message (null on success) and returns it. */
interface FormulierProps {
  klaar: (fout: string | null) => string | null;
  onAnnuleren: () => void;
}

/**
 * Form to add a question to an axis or to change one (text, label, theme, axis).
 * @param props.vraag - The question to change, or null to add
 * @param props.asId - Axis preselected for a new question
 * @param props.assen - Active axes to choose from
 * @param props.klaar - Handles the outcome
 * @param props.onAnnuleren - Closes the form
 * @returns the form
 */
export function VraagFormulier({ vraag, asId, assen, klaar, onAnnuleren }: FormulierProps & { vraag: CatVraag | null; asId: string; assen: CatAs[] }) {
  return (
    <ItemFormulier titel={vraag ? `Vraag wijzigen: ${vraag.kort}` : 'Vraag toevoegen'} idPrefix={vraag ? `vraag-${vraag.id}` : `nieuwe-vraag-${asId}`} velden={vraagVelden(assen)}
      begin={{ asId: vraag?.asId ?? asId, kort: vraag?.kort ?? '', tekst: vraag?.tekst ?? '', nds: vraag?.nds ?? '' }} knop={vraag ? 'Wijziging opslaan' : 'Vraag toevoegen'}
      onAnnuleren={onAnnuleren}
      onOpslaan={async (w) => {
        const body = { asId: w.asId, kort: w.kort, tekst: w.tekst, nds: w.nds || null };
        return klaar(vraag ? await wijzig('vragen', vraag.id, body) : await voegToe('vragen', body));
      }} />
  );
}

/**
 * Form to add an axis or rename one.
 * @param props.as - The axis to rename, or null to add
 * @param props.klaar - Handles the outcome
 * @param props.onAnnuleren - Closes the form
 * @returns the form
 */
export function AsFormulier({ as, klaar, onAnnuleren }: FormulierProps & { as: CatAs | null }) {
  return (
    <ItemFormulier titel={as ? `As wijzigen: ${as.naam}` : 'As toevoegen'} idPrefix={as ? `as-${as.id}` : 'nieuwe-as'} velden={AS_VELDEN} begin={{ naam: as?.naam ?? '' }}
      knop={as ? 'Wijziging opslaan' : 'As toevoegen'} onAnnuleren={onAnnuleren}
      onOpslaan={async (w) => klaar(as ? await wijzig('assen', as.id, { naam: w.naam }) : await voegToe('assen', { naam: w.naam }))} />
  );
}
