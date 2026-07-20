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

/** Explications pédagogiques par thème tactique, affichées à la demande */
export const THEME_EXPLANATIONS: Record<string, string> = {
  mateIn1: 'Mat immédiat : le roi adverse n’a plus aucune case ni aucune parade.',
  mateIn2: 'Une suite de deux coups forcés, chacun imposant la réponse adverse, mène droit au mat.',
  mateIn3: 'Une combinaison de trois coups forcés débouche inévitablement sur le mat.',
  doubleCheck: 'Échec double : deux pièces attaquent le roi en même temps. Seul un déplacement du roi peut parer les deux menaces à la fois.',
  backRankMate: 'Mat du couloir : le roi est bloqué par ses propres pions sur la dernière rangée, sans case de fuite.',
  smotheredMate: 'Mat à l’étouffée : le roi est encerclé par ses propres pièces, incapable de fuir le cavalier qui donne l’échec.',
  fork: 'Fourchette : un même coup attaque deux pièces adverses (ou plus) simultanément. L’adversaire ne peut en sauver qu’une seule.',
  pin: 'Clouage : la pièce visée ne peut pas bouger sans exposer une pièce plus précieuse (souvent le roi) juste derrière elle.',
  skewer: 'Enfilade : comme un clouage inversé — la pièce la plus précieuse est attaquée en premier, elle doit fuir et livre celle qui était derrière.',
  discoveredAttack: 'Attaque à la découverte : en déplaçant une pièce, on révèle l’attaque d’une autre pièce restée cachée derrière elle.',
  xRayAttack: 'Attaque à rayons X : une pièce attaque à travers une autre, qui ne protège la cible qu’en apparence.',
  deflection: 'Déviation : on force une pièce défensive à quitter la case ou la ligne qu’elle protégeait, pour porter le coup décisif ensuite.',
  attraction: 'Attraction : un sacrifice attire une pièce adverse (souvent le roi) sur une case défavorable, préparant la suite.',
  clearance: 'Dégagement : une pièce se déplace pour libérer une case ou une ligne, permettant à une autre pièce de porter le coup décisif.',
  interference: 'Interception : une pièce s’intercale sur la ligne qui reliait deux pièces adverses, coupant leur coordination.',
  capturingDefender: 'On élimine d’abord la pièce qui défendait la cible, avant de porter le coup décisif sur celle-ci.',
  trappedPiece: 'Pièce piégée : une pièce adverse n’a plus aucune case sûre pour s’échapper.',
  hangingPiece: 'Pièce en prise : une pièce adverse est laissée sans protection suffisante — il suffit de la capturer.',
  sacrifice: 'Sacrifice : on donne volontairement du matériel pour obtenir un avantage décisif (mat, gain supérieur, attaque irrésistible…).',
  quietMove: 'Coup tranquille : sans échec ni capture, mais il prépare une menace que l’adversaire ne peut pas parer.',
  intermezzo: 'Coup intermédiaire (zwischenzug) : au lieu de répondre directement à la menace, on place d’abord un coup plus fort qui change la donne.',
  zugzwang: 'Zugzwang : l’adversaire serait mieux s’il pouvait « passer » — le moindre coup qu’il joue aggrave sa position.',
  promotion: 'Promotion : un pion atteint la dernière rangée et se transforme en une pièce plus forte, généralement une dame.',
  underPromotion: 'Sous-promotion : promouvoir en cavalier, tour ou fou (plutôt qu’en dame) est ici le seul coup gagnant.',
  enPassant: 'Prise en passant : un pion capture le pion adverse qui vient d’avancer de deux cases, comme s’il n’avait avancé que d’une.',
  castling: 'Le roque intervient dans la solution : il met le roi en sécurité ou active brusquement la tour.',
  exposedKing: 'Le roi adverse est exposé, ce qui rend possible une attaque directe contre lui.',
  advancedPawn: 'Un pion très avancé devient une menace décisive qu’il faut exploiter immédiatement.',
  defensiveMove: 'Il faut d’abord trouver le coup défensif qui neutralise la menace adverse avant de reprendre l’initiative.',
};

/** Thèmes tactiques concrets, du plus spécifique au plus général : sert à choisir
 *  quelle explication afficher en priorité quand un puzzle a plusieurs thèmes. */
const THEME_PRIORITY = [
  'mateIn1', 'mateIn2', 'mateIn3', 'smotheredMate', 'backRankMate', 'doubleCheck',
  'fork', 'skewer', 'pin', 'discoveredAttack', 'xRayAttack', 'deflection', 'attraction',
  'clearance', 'interference', 'capturingDefender', 'trappedPiece', 'hangingPiece',
  'sacrifice', 'intermezzo', 'zugzwang', 'quietMove', 'underPromotion', 'promotion',
  'enPassant', 'castling', 'advancedPawn', 'defensiveMove', 'exposedKing',
];

/** Construit une explication lisible du motif tactique principal d'un puzzle. */
export function explainPuzzle(puzzle: Puzzle): string {
  const theme = THEME_PRIORITY.find((t) => puzzle.themes.includes(t));
  if (theme) return THEME_EXPLANATIONS[theme];
  return 'Cherche le coup qui crée une menace que l’adversaire ne peut pas parer sans perdre du matériel.';
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
