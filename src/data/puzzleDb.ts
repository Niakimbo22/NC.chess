export interface Puzzle {
  id: string;
  fen: string;
  /** Coups UCI : le premier est joué par l'adversaire, la solution alterne ensuite */
  moves: string[];
  rating: number;
  themes: string[];
}

let cache: Puzzle[] | null = null;

/** Charge la base (bundle séparé, ~670 Ko) une seule fois */
export async function loadPuzzles(): Promise<Puzzle[]> {
  if (cache) return cache;
  const raw = (await import('./puzzles.json')).default as [string, string, string, number, string][];
  cache = raw.map(([id, fen, moves, rating, themes]) => ({
    id,
    fen,
    moves: moves.split(' '),
    rating,
    themes: themes.split(' ').filter(Boolean),
  }));
  return cache;
}

export const THEME_FR: Record<string, string> = {
  mate: 'Mat',
  mateIn1: 'Mat en 1',
  mateIn2: 'Mat en 2',
  mateIn3: 'Mat en 3',
  fork: 'Fourchette',
  pin: 'Clouage',
  skewer: 'Enfilade',
  discoveredAttack: 'Attaque à la découverte',
  doubleCheck: 'Échec double',
  sacrifice: 'Sacrifice',
  deflection: 'Déviation',
  attraction: 'Attraction',
  clearance: 'Dégagement',
  interference: 'Interception',
  xRayAttack: 'Attaque rayons X',
  zugzwang: 'Zugzwang',
  trappedPiece: 'Pièce enfermée',
  hangingPiece: 'Pièce en prise',
  exposedKing: 'Roi exposé',
  backRankMate: 'Mat du couloir',
  smotheredMate: 'Mat à l’étouffée',
  promotion: 'Promotion',
  underPromotion: 'Sous-promotion',
  enPassant: 'En passant',
  castling: 'Roque',
  capturingDefender: 'Capture du défenseur',
  quietMove: 'Coup tranquille',
  intermezzo: 'Coup intermédiaire',
  endgame: 'Finale',
  middlegame: 'Milieu de partie',
  opening: 'Ouverture',
  rookEndgame: 'Finale de tours',
  pawnEndgame: 'Finale de pions',
  queenEndgame: 'Finale de dames',
  bishopEndgame: 'Finale de fous',
  knightEndgame: 'Finale de cavaliers',
  queenRookEndgame: 'Finale dame et tour',
  kingsideAttack: 'Attaque à l’aile roi',
  queensideAttack: 'Attaque à l’aile dame',
  advancedPawn: 'Pion avancé',
  defensiveMove: 'Coup défensif',
  crushing: 'Écrasement',
  advantage: 'Avantage',
  equality: 'Égalisation',
  short: 'Court',
  long: 'Long',
  veryLong: 'Très long',
  oneMove: 'Un coup',
  master: 'Partie de maître',
  masterVsMaster: 'Maître contre maître',
  superGM: 'Super GM',
};

/** Thèmes proposés dans le filtre d'entraînement */
export const FILTERABLE_THEMES = [
  'mateIn1', 'mateIn2', 'mateIn3', 'fork', 'pin', 'skewer', 'discoveredAttack',
  'sacrifice', 'hangingPiece', 'backRankMate', 'smotheredMate', 'promotion',
  'deflection', 'attraction', 'trappedPiece', 'endgame', 'middlegame', 'opening',
];

export interface PickOptions {
  rating: number;
  spread?: number;
  theme?: string | null;
  exclude?: Set<string>;
}

/** Choisit un puzzle proche du niveau demandé */
export function pickPuzzle(pool: Puzzle[], opts: PickOptions): Puzzle | null {
  const spread = opts.spread ?? 200;
  let candidates = pool.filter(
    (p) =>
      Math.abs(p.rating - opts.rating) <= spread &&
      !opts.exclude?.has(p.id) &&
      (!opts.theme || p.themes.includes(opts.theme))
  );
  if (candidates.length === 0) {
    candidates = pool.filter((p) => !opts.exclude?.has(p.id) && (!opts.theme || p.themes.includes(opts.theme)));
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Puzzle quotidien : déterministe pour une date donnée */
export function dailyPuzzle(pool: Puzzle[], date = new Date()): Puzzle {
  const key = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  // xorshift simple pour un index stable
  let x = key ^ 0x9e3779b9;
  x ^= x << 13; x ^= x >> 17; x ^= x << 5;
  const idx = Math.abs(x) % pool.length;
  return pool[idx];
}
