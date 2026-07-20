import { Chess } from 'chess.js';
import { Engine, evalToWhiteCp, type Candidate } from '../engine/engine';

export interface Bot {
  id: string;
  name: string;
  elo: number;
  avatar: string;
  description: string;
  style: string;
  /** Paramètres moteur */
  settings: {
    /** UCI_Elo (1320 min) — si absent : faible niveau simulé via skill + température */
    uciElo?: number;
    skill?: number;
    depth?: number;
    movetime?: number;
    /** Température de sélection : 0 = toujours le meilleur, élevé = joue des coups faibles */
    temperature?: number;
    /** Probabilité de jouer un coup légal aléatoire (gaffes des débutants) */
    randomMoveChance?: number;
  };
}

export const BOTS: Bot[] = [
  {
    id: 'nino', name: 'Nino', elo: 250, avatar: '🐣',
    description: 'Il vient d’apprendre comment bougent les pièces. Parfait pour débuter.',
    style: 'Joue presque au hasard',
    settings: { skill: 0, depth: 1, temperature: 500, randomMoveChance: 0.45 },
  },
  {
    id: 'lea', name: 'Léa', elo: 400, avatar: '🐰',
    description: 'Elle capture tout ce qui traîne mais oublie de protéger ses pièces.',
    style: 'Gourmande et étourdie',
    settings: { skill: 0, depth: 2, temperature: 350, randomMoveChance: 0.25 },
  },
  {
    id: 'max', name: 'Max', elo: 600, avatar: '🐶',
    description: 'Il connaît les valeurs des pièces et adore donner des échecs.',
    style: 'Enthousiaste mais brouillon',
    settings: { skill: 1, depth: 3, temperature: 250, randomMoveChance: 0.12 },
  },
  {
    id: 'zoe', name: 'Zoé', elo: 800, avatar: '🐱',
    description: 'Elle développe ses pièces et fait attention aux menaces simples.',
    style: 'Prudente',
    settings: { skill: 2, depth: 4, temperature: 180, randomMoveChance: 0.05 },
  },
  {
    id: 'tom', name: 'Tom', elo: 1000, avatar: '🎒',
    description: 'Le champion de son collège. Il repère les fourchettes et les clouages.',
    style: 'Tacticien en herbe',
    settings: { skill: 3, depth: 5, temperature: 120, randomMoveChance: 0.02 },
  },
  {
    id: 'sacha', name: 'Sacha', elo: 1200, avatar: '🎯',
    description: 'Un joueur de club solide qui punit les gaffes sans pitié.',
    style: 'Solide',
    settings: { skill: 5, depth: 6, temperature: 80 },
  },
  {
    id: 'camille', name: 'Camille', elo: 1400, avatar: '🐴',
    description: 'Elle adore les cavaliers et les positions fermées compliquées.',
    style: 'Manœuvrière',
    settings: { uciElo: 1400, movetime: 600 },
  },
  {
    id: 'boris', name: 'Boris', elo: 1600, avatar: '🧔',
    description: 'Un vétéran des tournois qui connaît ses classiques.',
    style: 'Positionnel',
    settings: { uciElo: 1600, movetime: 700 },
  },
  {
    id: 'elena', name: 'Elena', elo: 1800, avatar: '🦉',
    description: 'Chaque coup a un plan. Ne la laisse jamais s’installer.',
    style: 'Stratège',
    settings: { uciElo: 1800, movetime: 800 },
  },
  {
    id: 'karim', name: 'Karim', elo: 2000, avatar: '⚔️',
    description: 'Attaquant redoutable : il sacrifie et il mate.',
    style: 'Agressif',
    settings: { uciElo: 2000, movetime: 900 },
  },
  {
    id: 'vera', name: 'Véra', elo: 2400, avatar: '🤖',
    description: 'Précision quasi mécanique. Les erreurs se paient cash.',
    style: 'Machine',
    settings: { uciElo: 2400, movetime: 1000 },
  },
  {
    id: 'magnus-jr', name: 'Magnus Jr', elo: 2850, avatar: '👑',
    description: 'Le niveau d’un champion du monde. Bonne chance.',
    style: 'Universel',
    settings: { uciElo: 2850, movetime: 1200 },
  },
  {
    id: 'nc9000', name: 'NC-9000', elo: 3200, avatar: '💀',
    description: 'Stockfish à pleine puissance. Personne ne le bat. Personne.',
    style: 'Impitoyable',
    settings: { movetime: 1500, depth: 22 },
  },
];

export function getBot(id: string): Bot | undefined {
  return BOTS.find((b) => b.id === id);
}

/** Configure le moteur pour un bot donné */
export async function configureEngineForBot(engine: Engine, bot: Bot): Promise<void> {
  const s = bot.settings;
  if (s.uciElo) {
    await engine.setOptions({ UCI_LimitStrength: true, UCI_Elo: s.uciElo, 'Skill Level': 20 });
  } else {
    await engine.setOptions({ UCI_LimitStrength: false, 'Skill Level': s.skill ?? 20 });
  }
  await engine.newGame();
}

/** Choisit le coup du bot pour la position donnée */
export async function pickBotMove(engine: Engine, bot: Bot, fen: string): Promise<string> {
  const s = bot.settings;

  // Gaffe aléatoire des petits niveaux : un coup légal au hasard
  if (s.randomMoveChance && Math.random() < s.randomMoveChance) {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    const move = moves[Math.floor(Math.random() * moves.length)];
    return move.from + move.to + (move.promotion ?? '');
  }

  const multipv = s.temperature ? 5 : 1;
  const result = await engine.search(fen, {
    depth: s.depth,
    movetime: s.movetime,
    multipv,
  });

  if (!s.temperature || result.candidates.length <= 1) {
    return result.best;
  }

  // Sélection pondérée type softmax : plus la température est haute,
  // plus le bot accepte de jouer des coups sous-optimaux.
  const turn = fen.split(' ')[1] as 'w' | 'b';
  const scored = result.candidates.map((c: Candidate) => ({
    move: c.move,
    cp: evalToWhiteCp(c.eval, turn) * (turn === 'w' ? 1 : -1),
  }));
  const bestCp = Math.max(...scored.map((c) => c.cp));
  const weights = scored.map((c) => Math.exp(-(bestCp - c.cp) / s.temperature!));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < scored.length; i++) {
    r -= weights[i];
    if (r <= 0) return scored[i].move;
  }
  return result.best;
}

/**
 * Temps de « réflexion » simulé pour rendre le bot plus humain : il ne doit
 * pas répondre instantanément. La durée varie autour d'une base liée à sa
 * force, avec de temps en temps un coup rapide (réflexe) ou une longue
 * réflexion. Bornée par la pendule pour ne pas flageller le bot en blitz.
 */
export function botThinkDelay(bot: Bot, remainingMs?: number, ply?: number): number {
  const base = bot.elo < 800 ? 700 : bot.elo < 1600 ? 1000 : 1300;
  let delay = base + Math.random() * base; // base .. 2×base

  // Les premiers coups (théorie d'ouverture) sont joués plus vite.
  if (ply !== undefined && ply < 6) delay *= 0.45;

  // Rythme irrégulier : ~12 % de longues réflexions, ~22 % de coups réflexes.
  const r = Math.random();
  if (r < 0.12) delay *= 2.2;
  else if (r < 0.34) delay *= 0.3;

  // Ne jamais consommer plus de ~8 % du temps restant sur un coup.
  if (remainingMs && remainingMs > 0) delay = Math.min(delay, remainingMs * 0.08);

  return Math.max(250, Math.round(delay));
}
