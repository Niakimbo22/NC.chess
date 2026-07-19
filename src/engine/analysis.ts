import { Chess, type Color, type Move } from 'chess.js';
import { Engine, evalToWhiteCp } from './engine';

export type MoveClass =
  | 'brilliant'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder';

export const MOVE_CLASS_INFO: Record<MoveClass, { label: string; symbol: string; color: string }> = {
  brilliant: { label: 'Brillant', symbol: '!!', color: '#1baca6' },
  best: { label: 'Meilleur coup', symbol: '★', color: '#81b64c' },
  excellent: { label: 'Excellent', symbol: '!', color: '#96bc4b' },
  good: { label: 'Bon', symbol: '✓', color: '#a0a08e' },
  inaccuracy: { label: 'Imprécision', symbol: '?!', color: '#e8a33d' },
  mistake: { label: 'Erreur', symbol: '?', color: '#e58f2a' },
  blunder: { label: 'Gaffe', symbol: '??', color: '#e02828' },
};

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
  bestLineSan: string[];
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

function classify(cpLoss: number, isBest: boolean, brilliant: boolean): MoveClass {
  if (brilliant) return 'brilliant';
  if (isBest || cpLoss <= 5) return 'best';
  if (cpLoss <= 25) return 'excellent';
  if (cpLoss <= 60) return 'good';
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
    brilliant: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0,
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
    const classification = classify(cpLoss, isBest, brilliant);

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
      bestLineSan,
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

/** Commentaire du coach en français pour un coup analysé */
export function coachComment(m: AnalyzedMove): string {
  const best = m.bestLineSan[0];
  switch (m.classification) {
    case 'brilliant':
      return `Coup brillant ! ${m.san} est un sacrifice magnifique. Bravo !`;
    case 'best':
      return `${m.san} : le meilleur coup. Exactement ce que le moteur aurait joué.`;
    case 'excellent':
      return `${m.san} est excellent. Tu gardes le cap.`;
    case 'good':
      return `${m.san} est un bon coup, solide.`;
    case 'inaccuracy':
      return `${m.san} est une imprécision. ${best ? `${best} était plus précis.` : ''}`;
    case 'mistake':
      return `${m.san} est une erreur qui coûte du terrain. ${best ? `Il fallait jouer ${best}.` : ''}`;
    case 'blunder':
      return `Aïe, ${m.san} est une gaffe ! ${best ? `${best} était bien plus fort.` : ''} Regarde ce que l'adversaire peut faire maintenant.`;
  }
}
