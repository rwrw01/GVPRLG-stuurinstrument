'use client';

import { useState } from 'react';
import { verstuurJson } from './_verstuurJson';

/**
 * Button that sets a definitief platform back to concept. Only shown to beheerders by the caller;
 * the reopen route enforces the role itself.
 * @param props.jaar - Measurement year
 * @param props.platformId - Platform id
 * @param props.onHeropend - Called after a successful reopen so the page can re-fetch
 * @returns the button with an error message when the reopen failed
 */
export function HeropenenKnop({ jaar, platformId, onHeropend }: { jaar: string; platformId: string; onHeropend: () => void }) {
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  async function heropen() {
    if (!window.confirm('Weet je zeker dat je dit platform wilt heropenen? Het wordt weer concept.')) return;
    setBezig(true);
    setFout(null);
    const melding = await verstuurJson(`/api/metingen/${jaar}/platformen/${platformId}/heropenen`, 'POST');
    setBezig(false);
    if (melding) setFout(melding);
    else onHeropend();
  }

  return (
    <div className="heropenen">
      <button type="button" className="btn btn-warning" onClick={heropen} disabled={bezig}>Heropenen</button>
      {fout && <div className="alert alert-warning" role="alert">{fout}</div>}
    </div>
  );
}
