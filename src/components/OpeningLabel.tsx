import { useEffect, useMemo, useState } from 'react';
import type { Move } from 'chess.js';
import { loadOpenings, findOpening } from '../data/openingBook';

/** Nom de l'ouverture courante, affiché en direct pendant une partie */
export default function OpeningLabel({ history }: { history: Move[] }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadOpenings().then(() => mounted && setReady(true));
    return () => { mounted = false; };
  }, []);

  const opening = useMemo(() => {
    if (!ready || history.length === 0) return null;
    return findOpening(history.map((m) => m.san));
  }, [ready, history]);

  if (!opening) return null;
  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        borderRadius: 'var(--radius)',
        padding: '6px 12px',
        fontSize: 13,
        color: 'var(--text-dim)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
      title={`${opening.eco} — ${opening.name}`}
    >
      📖 <strong style={{ color: 'var(--text)' }}>{opening.name}</strong>
    </div>
  );
}
