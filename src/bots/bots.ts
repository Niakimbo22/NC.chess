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
    /**
     * Probabilité de « vision courte » : jouer le meilleur coup à 1 coup
     * d'avance seulement. Reproduit un oubli humain (rater une tactique en
     * deux temps, foncer sur du matériel) sans jamais jouer un coup absurde.
     */
    blunderChance?: number;
    /** Probabilité d'un vrai coup au hasard (réservé aux tout débutants). */
    randomMoveChance?: number;
    /**
     * « Instinct de prise » : probabilité de gober une pièce clairement en
     * prise (comme un amateur gourmand). Ne concerne que les prises DIRECTES —
     * les combinaisons (fourchettes, coups en deux temps) restent difficiles,
     * ce qui donne un profil d'erreur humain et crédible.
     */
    grabInstinct?: number;
  };
}

export const BOTS: Bot[] = [
  {
    id: 'nino', name: 'Nino', elo: 250, avatar: '🐣',
    description: 'Il vient d’apprendre comment bougent les pièces. Parfait pour débuter.',
    style: 'Découvre le jeu',
    settings: { skill: 0, depth: 2, temperature: 320, blunderChance: 0.38, randomMoveChance: 0.30, grabInstinct: 0.55 },
  },
  {
    id: 'lea', name: 'Léa', elo: 400, avatar: '🐰',
    description: 'Elle capture tout ce qui traîne mais oublie de protéger ses pièces.',
    style: 'Gourmande et étourdie',
    settings: { skill: 0, depth: 2, temperature: 190, blunderChance: 0.30, randomMoveChance: 0.12, grabInstinct: 0.88 },
  },
  {
    id: 'max', name: 'Max', elo: 600, avatar: '🐶',
    description: 'Il connaît les valeurs des pièces et adore donner des échecs.',
    style: 'Enthousiaste mais brouillon',
    settings: { skill: 2, depth: 3, temperature: 140, blunderChance: 0.18, randomMoveChance: 0.03, grabInstinct: 0.95 },
  },
  {
    id: 'zoe', name: 'Zoé', elo: 800, avatar: '🐱',
    description: 'Elle développe ses pièces et fait attention aux menaces simples.',
    style: 'Prudente',
    settings: { skill: 3, depth: 5, temperature: 110, blunderChance: 0.10, grabInstinct: 0.98 },
  },
  {
    id: 'tom', name: 'Tom', elo: 1000, avatar: '🎒',
    description: 'Le champion de son collège. Il repère les fourchettes et les clouages.',
    style: 'Tacticien en herbe',
    settings: { skill: 3, depth: 5, temperature: 120, blunderChance: 0.06 },
  },
  {
    id: 'sacha', name: 'Sacha', elo: 1200, avatar: '🎯',
    description: 'Un joueur de club solide qui punit les gaffes sans pitié.',
    style: 'Solide',
    settings: { skill: 5, depth: 6, temperature: 80, blunderChance: 0.03 },
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

// Valeurs matérielles (centipions) pour l'évaluation statique des échanges.
const SEE_VAL: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// Résout un échange sur une case en reprenant toujours avec la pièce la moins
// chère (Static Exchange Evaluation). Retourne le gain net pour le camp qui
// vient de prendre. Négatif/nul si la pièce est correctement défendue.
function resolveExchange(chess: Chess, to: string): number {
  const caps = chess
    .moves({ verbose: true })
    .filter((m) => m.to === to && m.captured);
  if (caps.length === 0) return 0;
  caps.sort((a, b) => SEE_VAL[a.piece] - SEE_VAL[b.piece]);
  const rc = caps[0];
  const captured = SEE_VAL[rc.captured as string];
  chess.move({ from: rc.from, to: rc.to, promotion: rc.promotion });
  const val = Math.max(0, captured - resolveExchange(chess, to));
  chess.undo();
  return val;
}

// Meilleure prise « gratuite » disponible (gain net ≥ seuil), sinon null.
// Sert à l'instinct de prise : une pièce clairement en prise, non défendue.
function bestFreeCapture(fen: string, threshold: number): string | null {
  const chess = new Chess(fen);
  let best: string | null = null;
  let bestGain = threshold - 1;
  for (const m of chess.moves({ verbose: true })) {
    if (!m.captured) continue;
    const target = chess.get(m.to);
    if (!target) continue; // en passant : ignoré (cas marginal)
    const c = new Chess(fen);
    c.move({ from: m.from, to: m.to, promotion: m.promotion });
    const gain = SEE_VAL[target.type] - resolveExchange(c, m.to);
    if (gain > bestGain) {
      bestGain = gain;
      best = m.from + m.to + (m.promotion ?? '');
    }
  }
  return best;
}

/** Choisit le coup du bot pour la position donnée */
export async function pickBotMove(engine: Engine, bot: Bot, fen: string): Promise<string> {
  const s = bot.settings;

  // 0) Instinct de prise : un amateur gobe presque toujours une pièce
  //    clairement en prise. Ne se déclenche que sur une prise DIRECTE gagnante
  //    (≥ une pièce mineure) ; les combinaisons restent, elles, difficiles.
  if (s.grabInstinct) {
    const grab = bestFreeCapture(fen, 180);
    if (grab && Math.random() < s.grabInstinct) return grab;
  }

  // 1) Vrai coup au hasard (tout petits niveaux uniquement) : le débutant qui
  //    « donne » une pièce sans raison.
  if (s.randomMoveChance && Math.random() < s.randomMoveChance) {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    const move = moves[Math.floor(Math.random() * moves.length)];
    return move.from + move.to + (move.promotion ?? '');
  }

  // 2) Vision courte : meilleur coup à 1 coup d'avance seulement. La recherche
  //    à profondeur 1 (avec quiescence) évite les pièces en prise immédiate
  //    mais rate les tactiques en deux temps — exactement le profil d'erreur
  //    d'un joueur amateur, bien plus crédible qu'un coup aléatoire.
  if (s.blunderChance && Math.random() < s.blunderChance) {
    const shallow = await engine.search(fen, { depth: 1 });
    if (shallow.best && shallow.best !== '(none)') return shallow.best;
  }

  // 3) Jeu normal, à la profondeur du bot.
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

/** Tirage gaussien standard (Box–Muller), base de la distribution log-normale. */
function gauss(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface ThinkContext {
  /** Position à jouer : c'est elle qui dicte l'essentiel du rythme. */
  fen?: string;
  remainingMs?: number;
  incrementMs?: number;
  ply?: number;
}

/**
 * Temps de « réflexion » simulé. Un vrai joueur ne répond pas au même rythme
 * à chaque coup : il enchaîne sa théorie d'ouverture, réplique du tac au tac
 * quand un seul coup est jouable, et bloque plusieurs secondes quand la
 * position est touffue. On modélise donc le délai à partir de la position
 * elle-même, avec une loi log-normale (beaucoup de coups d'un rythme moyen,
 * quelques longues réflexions) — un tirage uniforme donne un rythme mécanique.
 */
export function botThinkDelay(bot: Bot, ctx: ThinkContext = {}): number {
  const { fen, remainingMs, incrementMs = 0, ply } = ctx;

  let legalMoves = 30;
  let captures = 0;
  let inCheck = false;
  if (fen) {
    try {
      const chess = new Chess(fen);
      const moves = chess.moves({ verbose: true });
      legalMoves = moves.length;
      captures = moves.filter((m) => m.captured).length;
      inCheck = chess.inCheck();
    } catch {
      /* position illisible : on garde les valeurs par défaut */
    }
  }

  // Un seul coup légal : personne ne réfléchit, on joue.
  if (legalMoves === 1) return 300 + Math.round(Math.random() * 350);

  // Un joueur fort pèse ses coups ; un débutant dégaine.
  const base = bot.elo < 800 ? 1300 : bot.elo < 1600 ? 1700 : 2100;

  let factor = 0.7 + Math.min(legalMoves, 45) / 45; // position touffue = plus long
  if (inCheck) factor *= 1.2; // il faut répondre juste
  if (captures > 0) factor *= 1.1; // du matériel est en jeu
  if (ply !== undefined && ply < 8) factor *= 0.5; // théorie d'ouverture

  let delay = base * factor * Math.exp(gauss() * 0.4);

  // Pendule : on étale le temps restant sur les coups à venir, et on accélère
  // franchement quand il reste peu — exactement ce que fait un humain.
  if (remainingMs && remainingMs > 0) {
    const movesLeft = Math.max(12, 40 - (ply ?? 0) / 2);
    delay = Math.min(delay, remainingMs / movesLeft + incrementMs * 0.7);
    if (remainingMs < 30_000) delay = Math.min(delay, remainingMs * 0.04);
  }

  return Math.round(Math.min(Math.max(delay, 550), 7000));
}
