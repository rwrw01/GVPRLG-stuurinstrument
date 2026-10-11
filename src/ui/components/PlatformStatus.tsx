type Status = 'definitief' | 'concept' | null;

const WEERGAVE = {
  definitief: { tekst: 'Afgerond', klasse: 'status-definitief', pad: 'M7 12.5l3.2 3.2L17 9' },
  concept: { tekst: 'In bewerking', klasse: 'status-concept', pad: 'M8 16l1-3.5 6-6 2.5 2.5-6 6zM13.5 8l2.5 2.5' },
  leeg: { tekst: 'Nog niet ingevuld', klasse: 'status-leeg', pad: '' },
} as const;

/**
 * Status icon plus text for one platform within a meting, so colour is never the only cue.
 * @param props status of the platform, null when nothing has been saved yet
 * @returns inline icon with label
 */
export function PlatformStatus({ status }: { status: Status }) {
  const w = WEERGAVE[status ?? 'leeg'];
  return (
    <span className={`platform-status ${w.klasse}`}>
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
        <circle cx="12" cy="12" r="10.5" />
        {w.pad && <path d={w.pad} />}
      </svg>
      {w.tekst}
    </span>
  );
}
