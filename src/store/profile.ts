import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_RD, inflateRd, updateRating, type Rating } from './glicko';

export interface CategoryStats {
  wins: number;
  losses: number;
  draws: number;
}

/** État Glicko d'une cadence : rating, incertitude (RD) et date de dernière partie. */
export interface CategoryRating {
  rating: number;
  rd: number;
  /** timestamp de la dernière partie classée dans cette cadence (pour l'inflation du RD). */
  lastPlayed: number;
}

const DAY_MS = 86_400_000;
/**
 * Les bots sont des adversaires calibrés (moteur à Elo fixe) : on les traite
 * comme des joueurs au rating très fiable (RD faible), de sorte que la variation
 * du joueur dépende avant tout de SA propre incertitude.
 */
const BOT_RD = 40;
/** Les puzzles ont un rating un peu moins « dur » qu'un moteur fixe. */
const PUZZLE_RD = 60;

export interface ProfileState {
  pseudo: string;
  avatar: string;
  /** Petit texte de présentation affiché sur le profil */
  bio: string;
  /** Identifiant du titre/flair cosmétique choisi (voir FLAIRS) */
  flair: string;
  /** Identifiant du thème de bannière (voir BANNER_THEMES) */
  banner: string;
  /** Drapeau/emoji de pays optionnel */
  country: string;
  /** Rating « vitrine » : le rating de la dernière cadence jouée (échelle Elo). */
  elo: number;
  eloHistory: { date: number; elo: number }[];
  /** Ratings Glicko séparés par cadence (bullet/blitz/rapide/classique/none). */
  ratings: Record<string, CategoryRating>;
  puzzleElo: number;
  /** Incertitude (RD) du rating puzzle. */
  puzzleRd: number;
  puzzleSolved: number;
  puzzleFailed: number;
  puzzleRushBest: number;
  stats: Record<string, CategoryStats>; // clé : bullet/blitz/rapide/classique/none
  setProfile: (
    p: Partial<Pick<ProfileState, 'pseudo' | 'avatar' | 'bio' | 'flair' | 'banner' | 'country'>>
  ) => void;
  /** Met à jour l'Elo après une partie classée contre un bot. Retourne le delta. */
  recordRatedGame: (opponentElo: number, score: 0 | 0.5 | 1, category: string) => number;
  recordPuzzle: (puzzleRating: number, solved: boolean) => number;
  recordRushScore: (score: number) => void;
  resetProgress: () => void;
}

export const AVATARS = [
  '🙂', '😎', '🤓', '🥸', '🤩', '🥳', '😴', '🤔', '😏', '🤨',
  '🦊', '🐺', '🦁', '🐯', '🐸', '🐙', '🦄', '🐲', '🐼', '🐨',
  '🦉', '🦅', '🐢', '🐝', '🦈', '🐴', '🦖', '🐉', '🦩', '🦆',
  '👽', '🤠', '🥷', '🧙', '🦸', '👸', '🤴', '💂', '🧛', '🧚',
  '🤖', '👻', '💀', '🎃', '👑', '♟️', '♞', '♛', '⚡', '🔥',
];

/** Titres cosmétiques que le joueur peut afficher sous son pseudo. */
export const FLAIRS: { id: string; label: string }[] = [
  { id: '', label: 'Aucun' },
  { id: 'debutant', label: '🌱 Débutant' },
  { id: 'amateur', label: '♟️ Amateur' },
  { id: 'tacticien', label: '⚔️ Tacticien' },
  { id: 'stratege', label: '🧠 Stratège' },
  { id: 'blitz', label: '⚡ Roi du blitz' },
  { id: 'endgame', label: '👑 As des finales' },
  { id: 'gambit', label: '🔥 Amateur de gambits' },
  { id: 'solide', label: '🛡️ Joueur solide' },
  { id: 'maitre', label: '🏆 Maître local' },
];

/** Thèmes de bannière (dégradé d'en-tête du profil). */
export const BANNER_THEMES: { id: string; label: string; gradient: string }[] = [
  { id: 'gold', label: 'Or', gradient: 'linear-gradient(120deg, #6b5417, #ad863a 45%, #d4af37)' },
  { id: 'forest', label: 'Forêt', gradient: 'linear-gradient(120deg, #1e3a24, #3f7a4a 60%, #81b64c)' },
  { id: 'ocean', label: 'Océan', gradient: 'linear-gradient(120deg, #15304a, #1f5f8b 60%, #3fa9d4)' },
  { id: 'sunset', label: 'Couchant', gradient: 'linear-gradient(120deg, #5a1f3a, #a83f5b 55%, #e8a33d)' },
  { id: 'violet', label: 'Violet', gradient: 'linear-gradient(120deg, #2c1f4a, #5b3f8b 60%, #a06fd4)' },
  { id: 'ember', label: 'Braise', gradient: 'linear-gradient(120deg, #3a1512, #8b2f1f 55%, #e05a28)' },
  { id: 'slate', label: 'Ardoise', gradient: 'linear-gradient(120deg, #1a1916, #33322c 60%, #55534a)' },
  { id: 'ice', label: 'Glace', gradient: 'linear-gradient(120deg, #1c2b33, #3f6b78 55%, #86c2d4)' },
];

export function bannerGradient(id: string): string {
  return (BANNER_THEMES.find((b) => b.id === id) ?? BANNER_THEMES[0]).gradient;
}

export function flairLabel(id: string): string {
  return FLAIRS.find((f) => f.id === id)?.label ?? '';
}

/**
 * Cadence « principale » du joueur : celle où il a joué le plus de parties.
 * Sert de rating vitrine (en-tête de profil, accueil, P2P) — plus stable et
 * représentatif que la dernière cadence jouée. `prefer` départage les égalités
 * (typiquement la cadence qu'on vient de jouer).
 */
export function mainCategory(
  stats: Record<string, CategoryStats>,
  prefer?: string
): string | null {
  let best: string | null = null;
  let bestTotal = -1;
  for (const [cat, s] of Object.entries(stats)) {
    const total = s.wins + s.losses + s.draws;
    if (total > bestTotal || (total === bestTotal && cat === prefer)) {
      best = cat;
      bestTotal = total;
    }
  }
  return best;
}

const K_FACTOR = 32;

/**
 * Ancien calcul Elo à facteur K fixe. Conservé comme utilitaire/point de
 * comparaison ; le classement réel passe désormais par Glicko (voir `glicko.ts`).
 */
export function eloDelta(playerElo: number, opponentElo: number, score: number, k = K_FACTOR): number {
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  return Math.round(k * (score - expected));
}

const DEFAULTS = {
  pseudo: 'Joueur',
  avatar: '🙂',
  bio: '',
  flair: '',
  banner: 'gold',
  country: '',
  elo: 400,
  eloHistory: [] as { date: number; elo: number }[],
  ratings: {} as Record<string, CategoryRating>,
  puzzleElo: 400,
  puzzleRd: DEFAULT_RD,
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
        const now = Date.now();
        // Rating de la cadence AVANT la partie. Nouvelle cadence ⇒ on part de la
        // force déjà connue du joueur (son Elo actuel) avec l'incertitude maximale :
        // le rating se cale ensuite très vite. Cadence connue ⇒ on gonfle d'abord
        // le RD selon le temps d'inactivité.
        const prev = state.ratings[category];
        const before: Rating = prev
          ? { rating: prev.rating, rd: inflateRd(prev.rd, (now - prev.lastPlayed) / DAY_MS) }
          : { rating: state.elo, rd: DEFAULT_RD };

        const after = updateRating(before, { rating: opponentElo, rd: BOT_RD }, score);
        const newRating = Math.max(100, after.rating);
        const displayElo = Math.round(newRating);
        const delta = displayElo - Math.round(before.rating);

        const stats = { ...state.stats };
        const cat = stats[category] ?? { wins: 0, losses: 0, draws: 0 };
        stats[category] = {
          wins: cat.wins + (score === 1 ? 1 : 0),
          losses: cat.losses + (score === 0 ? 1 : 0),
          draws: cat.draws + (score === 0.5 ? 1 : 0),
        };

        const ratings = { ...state.ratings, [category]: { rating: newRating, rd: after.rd, lastPlayed: now } };
        // Rating vitrine = cadence la plus jouée (la partie courante départage).
        const mainCat = mainCategory(stats, category) ?? category;
        const mainElo = Math.round(mainCat === category ? newRating : ratings[mainCat]?.rating ?? newRating);

        set({
          elo: mainElo,
          ratings,
          stats,
          // La progression suit la cadence qui vient de changer (le résultat du jour).
          eloHistory: [...state.eloHistory, { date: now, elo: displayElo }].slice(-500),
        });
        return delta;
      },
      recordPuzzle: (puzzleRating, solved) => {
        const state = get();
        const before: Rating = { rating: state.puzzleElo, rd: state.puzzleRd ?? DEFAULT_RD };
        const after = updateRating(before, { rating: puzzleRating, rd: PUZZLE_RD }, solved ? 1 : 0);
        const newElo = Math.max(100, Math.round(after.rating));
        set({
          puzzleElo: newElo,
          puzzleRd: after.rd,
          puzzleSolved: state.puzzleSolved + (solved ? 1 : 0),
          puzzleFailed: state.puzzleFailed + (solved ? 0 : 1),
        });
        return newElo - before.rating;
      },
      recordRushScore: (score) => {
        const state = get();
        if (score > state.puzzleRushBest) set({ puzzleRushBest: score });
      },
      resetProgress: () => {
        // Remet à zéro la progression mais conserve l'identité (pseudo, avatar,
        // personnalisation) : réinitialiser ne doit pas effacer qui tu es.
        const { pseudo, avatar, bio, flair, banner, country } = get();
        set({ ...DEFAULTS, pseudo, avatar, bio, flair, banner, country });
      },
    }),
    { name: 'ncchess-profile' }
  )
);
