import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CategoryStats {
  wins: number;
  losses: number;
  draws: number;
}

export interface ProfileState {
  pseudo: string;
  avatar: string;
  elo: number;
  eloHistory: { date: number; elo: number }[];
  puzzleElo: number;
  puzzleSolved: number;
  puzzleFailed: number;
  puzzleRushBest: number;
  stats: Record<string, CategoryStats>; // clé : bullet/blitz/rapide/classique/none
  setProfile: (p: Partial<Pick<ProfileState, 'pseudo' | 'avatar'>>) => void;
  /** Met à jour l'Elo après une partie classée contre un bot. Retourne le delta. */
  recordRatedGame: (opponentElo: number, score: 0 | 0.5 | 1, category: string) => number;
  recordPuzzle: (puzzleRating: number, solved: boolean) => number;
  recordRushScore: (score: number) => void;
  resetProgress: () => void;
}

export const AVATARS = ['🙂', '😎', '🤓', '🥸', '🦊', '🐺', '🦁', '🐯', '🐸', '🐙', '🦄', '🐲', '👽', '🤠', '🥷', '🧙', '🦸', '👸', '🤴', '💂'];

const K_FACTOR = 32;

export function eloDelta(playerElo: number, opponentElo: number, score: number, k = K_FACTOR): number {
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  return Math.round(k * (score - expected));
}

const DEFAULTS = {
  pseudo: 'Joueur',
  avatar: '🙂',
  elo: 400,
  eloHistory: [] as { date: number; elo: number }[],
  puzzleElo: 400,
  puzzleSolved: 0,
  puzzleFailed: 0,
  puzzleRushBest: 0,
  stats: {} as Record<string, CategoryStats>,
};

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      setProfile: (p) => set(p),
      recordRatedGame: (opponentElo, score, category) => {
        const state = get();
        const delta = eloDelta(state.elo, opponentElo, score);
        const newElo = Math.max(100, state.elo + delta);
        const stats = { ...state.stats };
        const cat = stats[category] ?? { wins: 0, losses: 0, draws: 0 };
        stats[category] = {
          wins: cat.wins + (score === 1 ? 1 : 0),
          losses: cat.losses + (score === 0 ? 1 : 0),
          draws: cat.draws + (score === 0.5 ? 1 : 0),
        };
        set({
          elo: newElo,
          stats,
          eloHistory: [...state.eloHistory, { date: Date.now(), elo: newElo }].slice(-500),
        });
        return delta;
      },
      recordPuzzle: (puzzleRating, solved) => {
        const state = get();
        const delta = eloDelta(state.puzzleElo, puzzleRating, solved ? 1 : 0, 24);
        set({
          puzzleElo: Math.max(100, state.puzzleElo + delta),
          puzzleSolved: state.puzzleSolved + (solved ? 1 : 0),
          puzzleFailed: state.puzzleFailed + (solved ? 0 : 1),
        });
        return delta;
      },
      recordRushScore: (score) => {
        const state = get();
        if (score > state.puzzleRushBest) set({ puzzleRushBest: score });
      },
      resetProgress: () => set(DEFAULTS),
    }),
    { name: 'ncchess-profile' }
  )
);
