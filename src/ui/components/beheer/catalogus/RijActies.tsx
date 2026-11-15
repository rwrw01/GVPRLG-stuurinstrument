'use client';

interface RijActiesProps {
  naam: string;
  kanOmhoog: boolean;
  kanOmlaag: boolean;
  verwijderLabel: string;
  onVerplaats: (richting: 'omhoog' | 'omlaag') => void;
  onWijzig: () => void;
  onVerwijder: () => void;
}

/**
 * Action buttons of one catalogue row; every accessible name carries the item name.
 * @param props.naam - Name of the item, for the accessible names
 * @param props.kanOmhoog - Whether moving up is possible
 * @param props.kanOmlaag - Whether moving down is possible
 * @param props.verwijderLabel - Visible text of the remove button ("Verwijderen" or "Laten vervallen")
 * @param props.onVerplaats - Moves the item
 * @param props.onWijzig - Opens the edit form
 * @param props.onVerwijder - Removes the item (the caller confirms)
 * @returns the button group
 */
export function RijActies({ naam, kanOmhoog, kanOmlaag, verwijderLabel, onVerplaats, onWijzig, onVerwijder }: RijActiesProps) {
  return (
    <div className="btn-group beheer-acties">
      <button type="button" className="btn btn-outline" aria-label={`Omhoog: ${naam}`} disabled={!kanOmhoog} onClick={() => onVerplaats('omhoog')}>Omhoog</button>
      <button type="button" className="btn btn-outline" aria-label={`Omlaag: ${naam}`} disabled={!kanOmlaag} onClick={() => onVerplaats('omlaag')}>Omlaag</button>
      <button type="button" className="btn btn-outline" aria-label={`Wijzigen: ${naam}`} onClick={onWijzig}>Wijzigen</button>
      <button type="button" className="btn btn-danger" aria-label={`${verwijderLabel}: ${naam}`} onClick={onVerwijder}>{verwijderLabel}</button>
    </div>
  );
}

/**
 * The collapsed section with removed items and their "Weer actief maken" buttons.
 * @param props.titel - Summary text
 * @param props.items - Removed items with a description
 * @param props.beheerder - Whether the restore buttons are shown
 * @param props.onHerstel - Restores one item
 * @returns the details element, or null without removed items
 */
export function VervallenLijst({ titel, items, beheerder, onHerstel }: {
  titel: string;
  items: Array<{ id: string; naam: string; omschrijving: string }>;
  beheerder: boolean;
  onHerstel: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <details className="card vervallen-lijst">
      <summary>{titel} ({items.length})</summary>
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            <span>{i.omschrijving}</span>{' '}
            {beheerder && <button type="button" className="btn btn-outline" aria-label={`Weer actief maken: ${i.naam}`} onClick={() => onHerstel(i.id)}>Weer actief maken</button>}
          </li>
        ))}
      </ul>
    </details>
  );
}
