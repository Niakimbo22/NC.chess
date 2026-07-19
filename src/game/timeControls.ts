export interface TimeControl {
  id: string;
  name: string;
  category: 'bullet' | 'blitz' | 'rapide' | 'classique' | 'custom' | 'none';
  /** Temps initial en secondes (null = pas de pendule) */
  initial: number | null;
  /** Incrément en secondes */
  increment: number;
}

export const TIME_CONTROLS: TimeControl[] = [
  { id: 'none', name: 'Sans pendule', category: 'none', initial: null, increment: 0 },
  { id: '1+0', name: '1 min', category: 'bullet', initial: 60, increment: 0 },
  { id: '1+1', name: '1 | 1', category: 'bullet', initial: 60, increment: 1 },
  { id: '2+1', name: '2 | 1', category: 'bullet', initial: 120, increment: 1 },
  { id: '3+0', name: '3 min', category: 'blitz', initial: 180, increment: 0 },
  { id: '3+2', name: '3 | 2', category: 'blitz', initial: 180, increment: 2 },
  { id: '5+0', name: '5 min', category: 'blitz', initial: 300, increment: 0 },
  { id: '5+3', name: '5 | 3', category: 'blitz', initial: 300, increment: 3 },
  { id: '10+0', name: '10 min', category: 'rapide', initial: 600, increment: 0 },
  { id: '10+5', name: '10 | 5', category: 'rapide', initial: 600, increment: 5 },
  { id: '15+10', name: '15 | 10', category: 'rapide', initial: 900, increment: 10 },
  { id: '30+0', name: '30 min', category: 'classique', initial: 1800, increment: 0 },
  { id: '30+20', name: '30 | 20', category: 'classique', initial: 1800, increment: 20 },
];

export function customTimeControl(initialSec: number, incrementSec: number): TimeControl {
  const category =
    initialSec < 180 ? 'bullet' : initialSec < 600 ? 'blitz' : initialSec < 1800 ? 'rapide' : 'classique';
  return {
    id: `custom-${initialSec}+${incrementSec}`,
    name: `${Math.round(initialSec / 60)} | ${incrementSec} (perso)`,
    category,
    initial: initialSec,
    increment: incrementSec,
  };
}

export function formatClock(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (ms < 20000) {
    const tenths = Math.floor((ms % 1000) / 100);
    return `${min}:${String(sec).padStart(2, '0')}.${tenths}`;
  }
  if (min >= 60) {
    const h = Math.floor(min / 60);
    return `${h}:${String(min % 60).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${min}:${String(sec).padStart(2, '0')}`;
}
