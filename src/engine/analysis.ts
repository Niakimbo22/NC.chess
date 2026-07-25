import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { Engine, evalToWhiteCp } from './engine';

export type MoveClass =
  | 'brilliant'
  | 'best'
  | 'excellent'
  | 'good'
  | 'book'
  | 'inaccuracy'
  | 'mistake'
  | 'miss'
  | 'blunder';

export interface MoveClassInfo {
  label: string;
  symbol: string;
  color: string;
  /** Explication courte de ce que veut dire cette pastille (légende pédagogique) */
  blurb: string;
}

export const MOVE_CLASS_INFO: Record<MoveClass, MoveClassInfo> = {
  brilliant: {
    label: 'Brillant',
    symbol: '‼',
    color: '#1baca6',
    blurb: 'Un sacrifice juste : tu donnes du matériel et tu y gagnes quand même.',
  },
  best: {
    label: 'Meilleur',
    symbol: '★',
    color: '#81b64c',
    blurb: 'Exactement le coup que le moteur joue dans cette position.',
  },
  excellent: {
    label: 'Très bon',
    symbol: '!',
    color: '#3d9fe8',
    blurb: 'À un cheveu du meilleur coup : la position reste au même niveau.',
  },
  good: {
    label: 'Bon',
    symbol: '✓',
    color: '#a0a08e',
    blurb: 'Un coup sain, même si le moteur avait un peu mieux.',
  },
  book: {
    label: 'Théorique',
    symbol: '📖',
    color: '#b58863',
    blurb: 'Un coup d’ouverture connu, joué des milliers de fois avant toi.',
  },
  inaccuracy: {
    label: 'Imprécision',
    symbol: '?!',
    color: '#e8a33d',
    blurb: 'Rien de grave, mais tu laisses filer un peu d’avantage.',
  },
  mistake: {
    label: 'Erreur',
    symbol: '?',
    color: '#e58f2a',
    blurb: 'Un coup qui coûte cher : la position se dégrade nettement.',
  },
  miss: {
    label: 'Coup manqué',
    symbol: '✕',
    color: '#ee6a5f',
    blurb: 'Tu avais une occasion en or sous les yeux et tu es passé à côté.',
  },
  blunder: {
    label: 'Gaffe',
    symbol: '??',
    color: '#e02828',
    blurb: 'La grosse boulette : tu offres du matériel ou tu perds la partie.',
  },
};

/** Ordre d'affichage dans le bilan, du meilleur au pire. */
export const MOVE_CLASS_ORDER: MoveClass[] = [
  'brilliant', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder',
];

export interface AnalyzedMove {
  san: string;
  uci: string;
  color: Color;
  /** Éval (cp, point de vue blancs) avant / après le coup */
  cpBefore: number;
  cpAfter: number;
  /** Perte en centipions du point de vue du joueur */
  cpLoss: number;
  classification: MoveClass;
  bestMoveUci: string;
  /** Le meilleur coup en notation SAN (vide si le moteur n'a rien renvoyé) */
  bestMoveSan: string;
  bestLineSan: string[];
  /** Meilleure réponse de l'adversaire à ce coup (UCI) — sert à expliquer la réfutation */
  refutationUci: string;
  accuracy: number;
  fenBefore: string;
  fenAfter: string;
}

export interface GameAnalysis {
  moves: AnalyzedMove[];
  accuracy: { w: number; b: number };
  counts: { w: Record<MoveClass, number>; b: Record<MoveClass, number> };
  /** Éval de la position initiale (cp blancs) */
  initialCp: number;
}

export function winPercent(cp: number): number {
  const clamped = Math.max(-1500, Math.min(1500, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
}

interface ClassifyInput {
  cpLoss: number;
  isBest: boolean;
  brilliant: boolean;
  isBook: boolean;
  /** Éval avant / après, du point de vue du joueur qui joue */
  beforeMover: number;
  afterMover: number;
}

function classify({ cpLoss, isBest, brilliant, isBook, beforeMover, afterMover }: ClassifyInput): MoveClass {
  if (brilliant) return 'brilliant';
  if (isBest || cpLoss <= 5) return 'best';
  if (isBook) return 'book';
  if (cpLoss <= 25) return 'excellent';
  if (cpLoss <= 60) return 'good';

  // « Coup manqué » : l'occasion était là (mat forcé ou position gagnante) et on
  // reste correct après coup — ce n'est pas une gaffe, c'est un train raté.
  const missedMate = beforeMover >= 9000 && afterMover < 9000 && afterMover > -300;
  const missedWin = beforeMover >= 200 && cpLoss >= 150 && afterMover >= 50;
  if (missedMate || missedWin) return 'miss';

  if (cpLoss <= 120) return 'inaccuracy';
  if (cpLoss <= 250) return 'mistake';
  return 'blunder';
}

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * Heuristique « coup brillant » : le meilleur coup, qui sacrifie du matériel
 * (la pièce jouée peut être capturée par une pièce de moindre valeur, ou
 * capture une pièce de valeur inférieure à la sienne sur une case défendue)
 * alors que la position reste au moins égale.
 */
function isBrilliant(chess: Chess, move: Move, cpAfterMover: number): boolean {
  if (cpAfterMover < -50) return false;
  const movedValue = PIECE_VALUES[move.piece];
  if (movedValue <= 1) return false;
  const capturedValue = move.captured ? PIECE_VALUES[move.captured] : 0;
  // La case d'arrivée est-elle attaquée par l'adversaire ?
  const opponent: Color = move.color === 'w' ? 'b' : 'w';
  const attacked = chess.isAttacked(move.to, opponent);
  return attacked && movedValue - capturedValue >= 2;
}

export interface AnalyzeOptions {
  depth?: number;
  onProgress?: (done: number, total: number) => void;
  signal?: { cancelled: boolean };
  /** Nombre de demi-coups initiaux reconnus comme théorie d'ouverture */
  bookPlies?: number;
}

/** Analyse une partie complète : une évaluation par position + classification. */
export async function analyzeGame(
  sans: string[],
  engine: Engine,
  options: AnalyzeOptions = {}
): Promise<GameAnalysis | null> {
  const depth = options.depth ?? 12;
  await engine.setOptions({ UCI_LimitStrength: false, 'Skill Level': 20, MultiPV: 1 });
  await engine.newGame();

  // Rejoue la partie pour collecter FENs et coups
  const replay = new Chess();
  const fens: string[] = [replay.fen()];
  const moves: Move[] = [];
  for (const san of sans) {
    const m = replay.move(san);
    moves.push(m);
    fens.push(replay.fen());
  }

  // Évalue chaque position
  const evals: { cp: number; best: string; pv: string[] }[] = [];
  for (let i = 0; i < fens.length; i++) {
    if (options.signal?.cancelled) return null;
    const chess = new Chess(fens[i]);
    if (chess.isGameOver()) {
      const cp = chess.isCheckmate() ? (chess.turn() === 'w' ? -10000 : 10000) : 0;
      evals.push({ cp, best: '', pv: [] });
    } else {
      const { best, candidates } = await engine.search(fens[i], { depth });
      const turn = fens[i].split(' ')[1] as Color;
      const cp = candidates.length ? evalToWhiteCp(candidates[candidates.length - 1].eval, turn) : 0;
      evals.push({ cp, best, pv: candidates.length ? candidates[candidates.length - 1].pv : [] });
    }
    options.onProgress?.(i + 1, fens.length);
  }

  const analyzed: AnalyzedMove[] = [];
  const emptyCounts = (): Record<MoveClass, number> => ({
    brilliant: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, miss: 0, blunder: 0,
  });
  const counts = { w: emptyCounts(), b: emptyCounts() };
  const accSums = { w: [] as number[], b: [] as number[] };

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const sign = move.color === 'w' ? 1 : -1;
    const beforeMover = sign * evals[i].cp;
    const afterMover = sign * evals[i + 1].cp;
    const cpLoss = Math.max(0, beforeMover - afterMover);
    const uci = move.from + move.to + (move.promotion ?? '');
    const isBest = uci === evals[i].best;

    const chessAfter = new Chess(fens[i + 1]);
    const brilliant = isBest && cpLoss <= 5 && isBrilliant(chessAfter, move, afterMover);
    const classification = classify({
      cpLoss,
      isBest,
      brilliant,
      isBook: i < (options.bookPlies ?? 0),
      beforeMover,
      afterMover,
    });

    const winBefore = winPercent(beforeMover);
    const winAfter = winPercent(afterMover);
    const accuracy = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * Math.max(0, winBefore - winAfter)) - 3.1669));

    // Meilleure ligne en SAN
    const bestLineSan: string[] = [];
    try {
      const lineChess = new Chess(fens[i]);
      for (const u of evals[i].pv.slice(0, 5)) {
        const m = lineChess.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? (u[4] as Move['promotion']) : undefined });
        bestLineSan.push(m.san);
      }
    } catch {
      // ligne tronquée si un coup ne passe pas
    }
    const bestMoveSan = bestLineSan[0] ?? '';

    counts[move.color][classification]++;
    accSums[move.color].push(accuracy);

    analyzed.push({
      san: move.san,
      uci,
      color: move.color,
      cpBefore: evals[i].cp,
      cpAfter: evals[i + 1].cp,
      cpLoss,
      classification,
      bestMoveUci: evals[i].best,
      bestMoveSan,
      bestLineSan,
      refutationUci: evals[i + 1]?.best ?? '',
      accuracy,
      fenBefore: fens[i],
      fenAfter: fens[i + 1],
    });
  }

  const mean = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 100);
  return {
    moves: analyzed,
    accuracy: { w: Math.round(mean(accSums.w) * 10) / 10, b: Math.round(mean(accSums.b) * 10) / 10 },
    counts,
    initialCp: evals[0]?.cp ?? 0,
  };
}

const PIECE_TAKEN_FR: Record<string, string> = {
  p: 'un pion', n: 'un cavalier', b: 'un fou', r: 'une tour', q: 'la dame', k: 'le roi',
};

/** Reconstruit l'objet Move d'un coup analysé (pour connaître prise, roque, échec…). */
function safeMove(m: AnalyzedMove): Move | null {
  try {
    const chess = new Chess(m.fenBefore);
    return chess.move({
      from: m.uci.slice(0, 2),
      to: m.uci.slice(2, 4),
      promotion: m.uci.length > 4 ? (m.uci[4] as Move['promotion']) : undefined,
    });
  } catch {
    return null;
  }
}

/** Décrit l'action concrète du coup (prise, roque, promotion, échec). */
function describeAction(mv: Move): string {
  if (mv.flags.includes('k') || mv.flags.includes('q')) return 'Tu mets ton roi à l’abri en roquant.';
  if (mv.flags.includes('e')) return 'Tu captures en passant.';
  if (mv.promotion) return `Tu promeus ${mv.promotion === 'q' ? 'en dame' : 'ta pièce'}.`;
  if (mv.captured) {
    const check = mv.san.includes('+') ? ' avec échec' : '';
    return `Tu prends ${PIECE_TAKEN_FR[mv.captured]}${check}.`;
  }
  if (mv.san.includes('#')) return 'Échec et mat !';
  if (mv.san.includes('+')) return 'Tu donnes échec.';
  return '';
}

/** Décrit la situation d'évaluation après le coup, du point de vue du joueur. */
function describeEval(cpAfterWhite: number, mover: Color): string {
  const cp = mover === 'w' ? cpAfterWhite : -cpAfterWhite;
  if (cp >= 9000) return 'Tu tiens le mat.';
  if (cp <= -9000) return 'Attention, l’adversaire a un mat forcé.';
  if (cp >= 300) return 'Tu es nettement mieux.';
  if (cp >= 100) return 'Tu gardes l’avantage.';
  if (cp > -100) return 'La position reste équilibrée.';
  if (cp > -300) return 'Tu es légèrement moins bien.';
  return 'Ta position est désormais difficile.';
}

/** Commentaire du coach en français, détaillé et pédagogique, pour un coup analysé. */
export function coachComment(m: AnalyzedMove): string {
  const detail = safeMove(m);
  const action = detail ? describeAction(detail) : '';
  const best = m.bestLineSan[0];
  const bestLine = m.bestLineSan.slice(0, 3).join(' ');
  const lossP = (m.cpLoss / 100).toFixed(1);
  const evalTxt = describeEval(m.cpAfter, m.color);

  switch (m.classification) {
    case 'brilliant':
      return `✨ Coup brillant ! ${m.san} — ${action || 'un sacrifice audacieux'} Tu donnes du matériel pour un avantage bien plus grand : même le moteur applaudit. ${evalTxt}`;
    case 'best':
      return `${m.san} : le meilleur coup possible, exactement le choix du moteur. ${action} ${evalTxt}`.trim();
    case 'book':
      return `${m.san} appartient à la théorie de l’ouverture : un coup connu et éprouvé. ${action} ${evalTxt}`.trim();
    case 'excellent':
      return `${m.san} est excellent, à un cheveu du meilleur coup. ${action} ${evalTxt}`.trim();
    case 'good':
      return `${m.san} est un coup solide. ${best && best !== m.san ? `Le moteur préférait ${best}, mais ton choix ne gâche rien.` : ''} ${evalTxt}`.trim();
    case 'inaccuracy':
      return `${m.san} est une imprécision (tu laisses filer ~${lossP} point${Number(lossP) >= 2 ? 's' : ''}). ${best ? `${best} gardait mieux la main.` : ''} Rien de dramatique, mais on peut faire plus net. ${evalTxt}`.trim();
    case 'miss':
      return `${m.san} laisse filer l’occasion. ${best ? `${best} concluait${bestLine && m.bestLineSan.length > 1 ? ` — par exemple ${bestLine}.` : '.'}` : ''} ${evalTxt} Le réflexe à prendre : quand tu es nettement mieux, cherche le coup qui termine.`.trim();
    case 'mistake':
      return `${m.san} est une erreur : tu concèdes environ ${lossP} points. ${best ? `Il fallait jouer ${best}${bestLine && m.bestLineSan.length > 1 ? ` (la suite : ${bestLine})` : ''}.` : ''} ${evalTxt}`.trim();
    case 'blunder':
      return `❌ Grosse gaffe ! ${m.san} coûte ${lossP} points d’un seul coup. ${best ? `${best} était bien plus fort${bestLine && m.bestLineSan.length > 1 ? ` — par exemple ${bestLine}.` : '.'}` : ''} ${evalTxt} Le réflexe à prendre : avant de jouer, vérifie les prises et les menaces de l’adversaire.`.trim();
  }
}

// -------------------------------------------------- Vocabulaire & motifs

/**
 * Mots d'échecs expliqués en une phrase. Les commentaires du coach les
 * encadrent par [[…]] : l'interface les rend cliquables pour afficher la
 * définition. C'est le cœur pédagogique du bilan.
 */
export const GLOSSARY: Record<string, string> = {
  fourchette:
    'Une seule pièce attaque deux cibles à la fois. L’adversaire ne peut en sauver qu’une : tu gagnes l’autre.',
  clouage:
    'Une pièce ne peut plus bouger sans exposer une pièce plus précieuse derrière elle. Elle est paralysée.',
  enfilade:
    'Comme un clouage à l’envers : la pièce précieuse est devant, elle doit fuir, et tu prends celle de derrière.',
  'pion passé':
    'Un pion qu’aucun pion adverse ne peut plus arrêter sur sa route vers la promotion. Une arme redoutable en finale.',
  'échec et mat':
    'Le roi est en échec et aucun coup ne peut le sauver. La partie est finie.',
  'en prise':
    'Une pièce qui peut être capturée gratuitement, parce que personne ne la défend.',
  développement:
    'Sortir tes cavaliers et tes fous de leur case de départ pour qu’ils participent au jeu.',
  sacrifice:
    'Donner volontairement du matériel pour obtenir mieux : une attaque, un mat, ou une position gagnante.',
  centre:
    'Les quatre cases du milieu (d4, e4, d5, e5). Qui les contrôle contrôle la partie.',
  roque:
    'Le coup double roi + tour qui met ton roi à l’abri et active ta tour. À faire tôt.',
  promotion:
    'Un pion qui atteint la dernière rangée se transforme en la pièce de ton choix, presque toujours une dame.',
  initiative:
    'Quand c’est toi qui poses les problèmes et l’adversaire qui doit répondre. Ne la lâche pas.',
  cédé:
    'Laisser prendre une pièce sans compensation. Le péché numéro un : vérifie toujours ce qui est attaqué.',
  matériel:
    'La valeur totale de tes pièces : pion 1, cavalier et fou 3, tour 5, dame 9.',
};

const PIECE_FR: Record<string, { name: string; fem: boolean }> = {
  p: { name: 'pion', fem: false },
  n: { name: 'cavalier', fem: false },
  b: { name: 'fou', fem: false },
  r: { name: 'tour', fem: true },
  q: { name: 'dame', fem: true },
  k: { name: 'roi', fem: false },
};

const aPiece = (t: string) => `${PIECE_FR[t].fem ? 'une' : 'un'} ${PIECE_FR[t].name}`;
const yourPiece = (t: string) => `${PIECE_FR[t].fem ? 'ta' : 'ton'} ${PIECE_FR[t].name}`;

function uciToMove(fen: string, uci: string): Move | null {
  if (!uci || uci.length < 4) return null;
  try {
    const chess = new Chess(fen);
    return chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? (uci[4] as Move['promotion']) : undefined,
    });
  } catch {
    return null;
  }
}

/** Les pièces adverses qu'une pièce posée sur `to` attaque et qui valent le coup. */
function targetsOf(fenAfter: string, to: Square, mover: Color): PieceSymbol[] {
  const chess = new Chess(fenAfter);
  const attacker = chess.get(to);
  if (!attacker) return [];
  const attackerValue = PIECE_VALUES[attacker.type];
  const opponent: Color = mover === 'w' ? 'b' : 'w';
  const hits: PieceSymbol[] = [];
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== opponent) continue;
      if (!chess.attackers(cell.square, mover).includes(to)) continue;
      // Cible intéressante : le roi, une pièce plus chère, ou une pièce non défendue
      const defended = chess.attackers(cell.square, opponent).length > 0;
      if (cell.type === 'k' || PIECE_VALUES[cell.type] > attackerValue || !defended) {
        hits.push(cell.type);
      }
    }
  }
  return hits;
}

/** Vrai si le coup joué crée une fourchette (deux cibles ou plus). */
function isFork(fenBefore: string, uci: string): PieceSymbol[] | null {
  const mv = uciToMove(fenBefore, uci);
  if (!mv) return null;
  const chess = new Chess(fenBefore);
  chess.move({ from: mv.from, to: mv.to, promotion: mv.promotion });
  const hits = targetsOf(chess.fen(), mv.to, mv.color);
  return hits.length >= 2 ? hits : null;
}

/** Vrai si, après ce coup, un pion du joueur est passé. */
function createsPassedPawn(fenAfter: string, to: Square, mover: Color): boolean {
  const chess = new Chess(fenAfter);
  const piece = chess.get(to);
  if (!piece || piece.type !== 'p' || piece.color !== mover) return false;
  const file = to.charCodeAt(0) - 97;
  const rank = parseInt(to[1], 10);
  const opponent: Color = mover === 'w' ? 'b' : 'w';
  for (let f = Math.max(0, file - 1); f <= Math.min(7, file + 1); f++) {
    for (let r = 1; r <= 8; r++) {
      const ahead = mover === 'w' ? r > rank : r < rank;
      if (!ahead) continue;
      const sq = (String.fromCharCode(97 + f) + r) as Square;
      const p = chess.get(sq);
      if (p && p.type === 'p' && p.color === opponent) return false;
    }
  }
  return true;
}

/** La pièce que l'adversaire s'apprête à croquer gratuitement, s'il y en a une. */
function hangingAfter(m: AnalyzedMove): PieceSymbol | null {
  const reply = uciToMove(m.fenAfter, m.refutationUci);
  if (!reply || !reply.captured) return null;
  const chess = new Chess(m.fenAfter);
  const defenders = chess.attackers(reply.to, m.color).length;
  const gain = PIECE_VALUES[reply.captured] - (defenders > 0 ? PIECE_VALUES[reply.piece] : 0);
  return gain >= 2 ? reply.captured : null;
}

// ------------------------------------------------------ Commentaire guidé

export interface CoachTip {
  /** Libellé de la pastille : « Coup manqué », « Très bon coup »… */
  title: string;
  classification: MoveClass;
  /** Éval après le coup, format court : « +1.2 », « −0.08 », « M3 » */
  chip: string;
  /**
   * Une à deux phrases courtes. Les termes de vocabulaire sont encadrés par
   * [[…]] pour être surlignés et expliqués par l'interface.
   */
  text: string;
  /** Coup à montrer sur l'échiquier en alternative (UCI), s'il y a mieux à jouer */
  betterUci: string | null;
}

/** Éval compacte du point de vue du joueur qui vient de jouer. */
export function evalChip(m: AnalyzedMove): string {
  const cp = m.color === 'w' ? m.cpAfter : -m.cpAfter;
  if (cp >= 9000) return 'M';
  if (cp <= -9000) return '−M';
  const v = cp / 100;
  return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}`;
}

/**
 * Commentaire court, concret et imagé pour la revue guidée : ce que le coup a
 * fait, ce qu'il fallait faire, et le mot d'échecs à retenir. Une ou deux
 * phrases maximum — c'est ce qui rend le bilan lisible d'un coup d'œil.
 */
export function coachTip(m: AnalyzedMove): CoachTip {
  const info = MOVE_CLASS_INFO[m.classification];
  const chip = evalChip(m);
  const played = safeMove(m);
  const best = m.bestMoveSan;
  const betterUci =
    m.classification === 'best' || m.classification === 'brilliant' || m.classification === 'book'
      ? null
      : m.bestMoveUci || null;

  const mateIn = (() => {
    const cp = m.color === 'w' ? m.cpBefore : -m.cpBefore;
    return cp >= 9000 ? Math.max(1, Math.round((10000 - Math.abs(cp)) / 2) || 1) : 0;
  })();

  let text: string;

  switch (m.classification) {
    case 'brilliant': {
      text = `Magnifique ! ${m.san} est un [[sacrifice]] que le moteur approuve : tu rends du [[matériel]] et tu ressors gagnant.`;
      break;
    }
    case 'best': {
      const fork = isFork(m.fenBefore, m.uci);
      if (fork && fork.length >= 2) {
        text = `Le meilleur coup, et en prime une [[fourchette]] : ${m.san} attaque ${aPiece(fork[0])} et ${aPiece(fork[1])} en même temps.`;
      } else if (played?.san.includes('#')) {
        text = `[[échec et mat]] ! ${m.san} termine la partie proprement.`;
      } else if (createsPassedPawn(m.fenAfter, m.uci.slice(2, 4) as Square, m.color)) {
        text = `Exactement le coup du moteur : tu te crées un [[pion passé]] avec ${m.san}.`;
      } else if (played?.captured) {
        text = `Le meilleur coup : ${m.san} prend ${aPiece(played.captured)} et tu gardes la main.`;
      } else {
        text = `${m.san} : pile le coup du moteur. Rien à redire, tu gardes l’[[initiative]].`;
      }
      break;
    }
    case 'book': {
      if (played?.flags.includes('k') || played?.flags.includes('q')) {
        text = `${m.san} : le [[roque]], un grand classique de l’ouverture. Ton roi est à l’abri.`;
      } else if (played?.piece === 'n' || played?.piece === 'b') {
        text = `${m.san} est un coup de théorie : il sert le [[développement]] de tes pièces.`;
      } else {
        text = `${m.san} fait partie de la théorie de l’ouverture. Un coup joué des milliers de fois pour le contrôle du [[centre]].`;
      }
      break;
    }
    case 'excellent': {
      text = `${m.san} est un très bon coup, à un cheveu du meilleur.${best && best !== m.san ? ` Le moteur préférait ${best}, mais la différence est minuscule.` : ''}`;
      break;
    }
    case 'good': {
      text = `${m.san} tient la route.${best && best !== m.san ? ` ${best} était un poil plus précis, sans plus.` : ''}`;
      break;
    }
    case 'inaccuracy': {
      text = `Petit relâchement avec ${m.san}.${best && best !== m.san ? ` ${best} gardait mieux la pression.` : ''}`;
      break;
    }
    case 'miss': {
      if (mateIn > 0) {
        text = `Tu avais un [[échec et mat]] forcé sous les yeux !${best ? ` ${best} concluait la partie.` : ''}`;
      } else {
        const fork = best ? isFork(m.fenBefore, m.bestMoveUci) : null;
        if (fork && fork.length >= 2) {
          text = `Occasion manquée : ${best} plantait une [[fourchette]] sur ${aPiece(fork[0])} et ${aPiece(fork[1])}.`;
        } else {
          const grab = uciToMove(m.fenBefore, m.bestMoveUci);
          text = grab?.captured
            ? `Tu es passé à côté : ${best} gagnait ${aPiece(grab.captured)} gratuitement.`
            : `Tu avais bien mieux avec ${best} — l’occasion ne se représentera pas.`;
        }
      }
      break;
    }
    case 'mistake': {
      const hung = hangingAfter(m);
      const loss = (m.cpLoss / 100).toFixed(1);
      text = hung
        ? `Attention, ${yourPiece(hung)} se retrouve [[en prise]] après ${m.san}.${best ? ` ${best} tenait la position.` : ''}`
        : `${m.san} coûte cher : tu perds environ ${loss} point${Number(loss) >= 2 ? 's' : ''}.${best ? ` Il fallait jouer ${best}.` : ''}`;
      break;
    }
    case 'blunder': {
      const hung = hangingAfter(m);
      if (played?.san.includes('#')) {
        text = `Cette fois c’est [[échec et mat]] contre toi. ${best ? `${best} tenait encore.` : ''}`;
      } else if (hung) {
        text = `Aïe ! Tu as [[cédé]] ${aPiece(hung)} avec ${m.san}.${best ? ` ${best} sauvait tout.` : ''}`;
      } else {
        text = `Grosse gaffe : ${m.san} lâche ${(m.cpLoss / 100).toFixed(1)} points d’un coup.${best ? ` ${best} était bien plus solide.` : ''}`;
      }
      break;
    }
  }

  return { title: info.label, classification: m.classification, chip, text, betterUci };
}

/** Découpe un texte de coach en morceaux : texte simple + termes de vocabulaire. */
export function splitTip(text: string): { text: string; term?: string }[] {
  const parts: { text: string; term?: string }[] = [];
  const re = /\[\[(.+?)\]\]/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    parts.push({ text: match[1], term: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

// ------------------------------------------------------------ Phases & étapes

export type Phase = 'opening' | 'middlegame' | 'endgame';

export const PHASE_LABEL: Record<Phase, string> = {
  opening: 'Ouverture',
  middlegame: 'Milieu de jeu',
  endgame: 'Finale',
};

/** Bornes (en demi-coups) des trois phases de la partie. */
export function phaseRanges(total: number, bookPlies = 0): Record<Phase, [number, number]> {
  const openEnd = Math.min(total, Math.max(bookPlies, Math.min(20, Math.floor(total / 3))));
  const midEnd = Math.min(total, openEnd + Math.max(1, Math.floor((total - openEnd) * 0.6)));
  return { opening: [0, openEnd], middlegame: [openEnd, midEnd], endgame: [midEnd, total] };
}

/** Note (sous forme de pastille) obtenue par chaque camp sur chaque phase. */
export function phaseGrades(
  a: GameAnalysis,
  bookPlies = 0
): Record<Phase, { w: MoveClass | null; b: MoveClass | null }> {
  const ranges = phaseRanges(a.moves.length, bookPlies);
  const gradeOf = (loss: number): MoveClass => {
    if (loss <= 10) return 'best';
    if (loss <= 25) return 'excellent';
    if (loss <= 60) return 'good';
    if (loss <= 110) return 'inaccuracy';
    if (loss <= 200) return 'mistake';
    return 'blunder';
  };
  const out = {} as Record<Phase, { w: MoveClass | null; b: MoveClass | null }>;
  for (const phase of ['opening', 'middlegame', 'endgame'] as Phase[]) {
    const [from, to] = ranges[phase];
    const forColor = (c: Color): MoveClass | null => {
      const seg = a.moves.filter((m, i) => i >= from && i < to && m.color === c);
      if (!seg.length) return null;
      return gradeOf(seg.reduce((s, m) => s + m.cpLoss, 0) / seg.length);
    };
    out[phase] = { w: forColor('w'), b: forColor('b') };
  }
  return out;
}

/**
 * Les coups sur lesquels la revue guidée s'arrête : tout ce qui est marquant
 * (théorie d'entrée, gaffes, occasions manquées, coups brillants) plutôt que
 * les 40 coups de la partie. C'est ce qui rend le bilan digeste.
 */
export function guidedStops(a: GameAnalysis, focus: Color | null = null): number[] {
  const notable: MoveClass[] = ['brilliant', 'excellent', 'miss', 'mistake', 'blunder'];
  const stops = a.moves
    .map((m, i) => ({ m, i }))
    .filter(({ m, i }) => {
      if (focus && m.color !== focus) return false;
      if (i < 2) return true; // les tout premiers coups posent le décor
      if (m.classification === 'book' && i < 8) return true; // la théorie s'explique
      return notable.includes(m.classification);
    })
    .map(({ i }) => i);
  // Toujours finir sur le dernier coup de la partie (du camp suivi, le cas échéant)
  let last = a.moves.length - 1;
  while (last >= 0 && focus && a.moves[last].color !== focus) last--;
  if (last >= 0 && !stops.includes(last)) stops.push(last);
  return stops.sort((x, y) => x - y);
}

// ------------------------------------------------------------ Bilan de partie

export interface KeyMoment {
  /** Index dans analysis.moves (= position du curseur de revue) */
  cursor: number;
  moveNo: number;
  san: string;
  color: Color;
  text: string;
}

export interface ReviewSummary {
  headline: string;
  accuracyGrade: { w: string; b: string };
  /** Paragraphes narratifs détaillés */
  paragraphs: string[];
  /** Moments-clés cliquables (tournants, gaffes décisives) */
  keyMoments: KeyMoment[];
}

function grade(acc: number): string {
  if (acc >= 95) return 'exceptionnel';
  if (acc >= 90) return 'excellent';
  if (acc >= 80) return 'très bon';
  if (acc >= 70) return 'bon';
  if (acc >= 60) return 'correct';
  if (acc >= 50) return 'perfectible';
  return 'difficile';
}

const SIDE = (c: Color, w: string, b: string) => (c === 'w' ? w : b);

/**
 * Construit un bilan narratif complet de la partie : verdict, précision,
 * plus grosses erreurs de chaque camp, tournant, phases, et conseils.
 */
export function buildReviewSummary(
  a: GameAnalysis,
  whiteName = 'Blancs',
  blackName = 'Noirs',
  openingName?: string
): ReviewSummary {
  const keyMoments: KeyMoment[] = [];
  const paragraphs: string[] = [];
  const total = a.moves.length;

  // 1. Précision + décompte des erreurs
  const errs = (c: 'w' | 'b') => ({
    blunder: a.counts[c].blunder,
    mistake: a.counts[c].mistake,
    inaccuracy: a.counts[c].inaccuracy,
    brilliant: a.counts[c].brilliant,
  });
  const ew = errs('w');
  const eb = errs('b');

  const openingTxt = openingName ? ` Ouverture : ${openingName}.` : '';
  paragraphs.push(
    `Précision — ${whiteName} : ${a.accuracy.w} % (${grade(a.accuracy.w)}), ${blackName} : ${a.accuracy.b} % (${grade(a.accuracy.b)}).${openingTxt} Sur ${total} coups joués, on relève ${ew.blunder + eb.blunder} gaffe${ew.blunder + eb.blunder > 1 ? 's' : ''}, ${ew.mistake + eb.mistake} erreur${ew.mistake + eb.mistake > 1 ? 's' : ''} et ${ew.inaccuracy + eb.inaccuracy} imprécision${ew.inaccuracy + eb.inaccuracy > 1 ? 's' : ''}.`
  );

  if (ew.brilliant + eb.brilliant > 0) {
    paragraphs.push(
      `💎 ${ew.brilliant + eb.brilliant} coup${ew.brilliant + eb.brilliant > 1 ? 's' : ''} brillant${ew.brilliant + eb.brilliant > 1 ? 's' : ''} dans cette partie — de beaux sacrifices bien vus !`
    );
  }

  // 2. Plus grosse erreur de chaque camp
  for (const color of ['w', 'b'] as Color[]) {
    let worst: AnalyzedMove | null = null;
    let worstIdx = -1;
    a.moves.forEach((mv, i) => {
      if (mv.color !== color) return;
      if ((mv.classification === 'blunder' || mv.classification === 'mistake') && (!worst || mv.cpLoss > worst.cpLoss)) {
        worst = mv;
        worstIdx = i;
      }
    });
    if (worst && worstIdx >= 0) {
      const w = worst as AnalyzedMove;
      const moveNo = Math.floor(worstIdx / 2) + 1;
      const name = SIDE(color, whiteName, blackName);
      const best = w.bestLineSan[0];
      const text = `Le coup à revoir de ${name} : ${moveNo}.${color === 'w' ? '' : '..'} ${w.san} (−${(w.cpLoss / 100).toFixed(1)}).${best ? ` ${best} tenait la position.` : ''}`;
      keyMoments.push({ cursor: worstIdx, moveNo, san: w.san, color, text });
    }
  }

  // 3. Tournant : plus gros basculement du % de victoire (blancs)
  const wp = a.moves.map((m) => winPercent(m.cpAfter));
  let swingIdx = -1;
  let swingMax = 0;
  for (let i = 0; i < wp.length; i++) {
    const prev = i === 0 ? winPercent(a.initialCp) : wp[i - 1];
    const delta = Math.abs(wp[i] - prev);
    if (delta > swingMax) {
      swingMax = delta;
      swingIdx = i;
    }
  }
  if (swingIdx >= 0 && swingMax >= 15) {
    const mv = a.moves[swingIdx];
    const moveNo = Math.floor(swingIdx / 2) + 1;
    const benefited = wp[swingIdx] > (swingIdx === 0 ? winPercent(a.initialCp) : wp[swingIdx - 1]) ? whiteName : blackName;
    keyMoments.push({
      cursor: swingIdx,
      moveNo,
      san: mv.san,
      color: mv.color,
      text: `⚡ Le tournant : coup ${moveNo} (${mv.san}). C’est là que l’avantage a basculé en faveur de ${benefited}.`,
    });
  }

  // 4. Phases : où le joueur a été le plus fragile
  const phaseLoss = (from: number, to: number, color: Color) => {
    const seg = a.moves.filter((m, i) => i >= from && i < to && m.color === color);
    if (!seg.length) return null;
    return seg.reduce((s, m) => s + m.cpLoss, 0) / seg.length;
  };
  const third = Math.max(1, Math.floor(total / 3));
  const phases: { name: string; from: number; to: number }[] = [
    { name: 'l’ouverture', from: 0, to: third },
    { name: 'le milieu de partie', from: third, to: 2 * third },
    { name: 'la finale', from: 2 * third, to: total },
  ];
  for (const color of ['w', 'b'] as Color[]) {
    const scored = phases
      .map((p) => ({ p, loss: phaseLoss(p.from, p.to, color) }))
      .filter((x) => x.loss != null) as { p: { name: string }; loss: number }[];
    if (scored.length >= 2) {
      const best = scored.reduce((a2, b2) => (b2.loss < a2.loss ? b2 : a2));
      const worst = scored.reduce((a2, b2) => (b2.loss > a2.loss ? b2 : a2));
      if (best.p.name !== worst.p.name) {
        paragraphs.push(
          `${SIDE(color, whiteName, blackName)} : le plus solide dans ${best.p.name}, le plus fragile dans ${worst.p.name}.`
        );
      }
    }
  }

  // 5. Conseil ciblé selon le profil d'erreurs (côté joueur = blancs par défaut)
  const advice: string[] = [];
  if (ew.blunder + eb.blunder >= 3) advice.push('Ralentis sur les positions tendues : la plupart des points se perdent en une poignée de coups précipités.');
  if (ew.inaccuracy + eb.inaccuracy >= 5) advice.push('Beaucoup de petites imprécisions : travaille les plans à moyen terme plutôt que le coup par coup.');
  if (keyMoments.some((k) => k.text.includes('prend') || k.text.includes('prise'))) advice.push('Vérifie systématiquement les prises disponibles avant de jouer.');
  if (advice.length === 0) advice.push('Partie propre : continue à jouer des coups solides et à sécuriser ton roi tôt.');
  paragraphs.push('💡 ' + advice.join(' '));

  // Verdict d'en-tête
  const finalCp = a.moves.length ? a.moves[a.moves.length - 1].cpAfter : a.initialCp;
  const diff = Math.abs(a.accuracy.w - a.accuracy.b);
  let headline: string;
  if (Math.abs(finalCp) >= 9000) {
    headline = finalCp > 0 ? `Victoire des ${whiteName} au tapis.` : `Les ${blackName} concluent au mat.`;
  } else if (diff < 4) {
    headline = 'Partie serrée, les deux camps au coude-à-coude.';
  } else {
    const better = a.accuracy.w > a.accuracy.b ? whiteName : blackName;
    headline = `Partie menée plus proprement par ${better}.`;
  }

  return {
    headline,
    accuracyGrade: { w: grade(a.accuracy.w), b: grade(a.accuracy.b) },
    paragraphs,
    keyMoments,
  };
}
