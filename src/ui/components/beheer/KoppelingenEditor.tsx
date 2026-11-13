'use client';

import { useState } from 'react';
import { PlatformKeuze } from './PlatformKeuze';

/**
 * Inline editor for a user's platform links in one year.
 * @param props.gebruikerId - User whose links are edited (keeps checkbox ids unique)
 * @param props.huidig - Current platform ids
 * @param props.onOpslaan - Receives the new selection
 * @param props.onAnnuleren - Closes the editor without saving
 * @returns the checkboxes with save/cancel buttons
 */
export function KoppelingenEditor(props: {
  gebruikerId: string;
  huidig: string[];
  onOpslaan: (platformIds: string[]) => void;
  onAnnuleren: () => void;
}) {
  const [gekozen, setGekozen] = useState<string[]>(props.huidig);
  return (
    <div className="koppelingen-editor">
      <PlatformKeuze gekozen={gekozen} onChange={setGekozen} idPrefix={`koppeling-${props.gebruikerId}`} />
      <div className="btn-group">
        <button type="button" className="btn btn-primary" onClick={() => props.onOpslaan(gekozen)}>Koppelingen opslaan</button>
        <button type="button" className="btn btn-outline" onClick={props.onAnnuleren}>Annuleren</button>
      </div>
    </div>
  );
}
