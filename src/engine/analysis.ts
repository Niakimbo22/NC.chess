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
    case 'excellent':
      return `${m.san} est excellent, à un cheveu du meilleur coup. ${action} ${evalTxt}`.trim();
    case 'good':
      return `${m.san} est un coup solide. ${best && best !== m.san ? `Le moteur préférait ${best}, mais ton choix ne gâche rien.` : ''} ${evalTxt}`.trim();
    case 'inaccuracy':
      return `${m.san} est une imprécision (tu laisses filer ~${lossP} point${Number(lossP) >= 2 ? 's' : ''}). ${best ? `${best} gardait mieux la main.` : ''} Rien de dramatique, mais on peut faire plus net. ${evalTxt}`.trim();
    case 'mistake':
      return `${m.san} est une erreur : tu concèdes environ ${lossP} points. ${best ? `Il fallait jouer ${best}${bestLine && m.bestLineSan.length > 1 ? ` (la suite : ${bestLine})` : ''}.` : ''} ${evalTxt}`.trim();
    case 'blunder':
      return `❌ Grosse gaffe ! ${m.san} coûte ${lossP} points d’un seul coup. ${best ? `${best} était bien plus fort${bestLine && m.bestLineSan.length > 1 ? ` — par exemple ${bestLine}.` : '.'}` : ''} ${evalTxt} Le réflexe à prendre : avant de jouer, vérifie les prises et les menaces de l’adversaire.`.trim();
  }
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
