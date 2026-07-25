import { describe, expect, it } from 'vitest';
import { Chess, type Color } from 'chess.js';
import {
  GLOSSARY,
  MOVE_CLASS_INFO,
  MOVE_CLASS_ORDER,
  coachTip,
  evalChip,
  guidedStops,
  phaseGrades,
  phaseRanges,
  splitTip,
  type AnalyzedMove,
  type GameAnalysis,
  type MoveClass,
} from '../engine/analysis';
import { bookDepth, loadOpenings } from '../data/openingBook';

/** Fabrique un coup analysé à partir d'une position et d'un SAN. */
function makeMove(
  fenBefore: string,
  san: string,
  over: Partial<AnalyzedMove> = {}
): AnalyzedMove {
  const chess = new Chess(fenBefore);
  const mv = chess.move(san);
  return {
    san: mv.san,
    uci: mv.from + mv.to + (mv.promotion ?? ''),
    color: mv.color,
    cpBefore: 0,
    cpAfter: 0,
    cpLoss: 0,
    classification: 'best',
    bestMoveUci: mv.from + mv.to,
    bestMoveSan: mv.san,
    bestLineSan: [mv.san],
    refutationUci: '',
    accuracy: 100,
    fenBefore,
    fenAfter: chess.fen(),
    ...over,
  };
}

const START = new Chess().fen();

describe('splitTip', () => {
  it('sépare le texte et les termes de vocabulaire', () => {
    const parts = splitTip('Attention, ta tour est [[en prise]] après ce coup.');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toEqual({ text: 'Attention, ta tour est ' });
    expect(parts[1]).toEqual({ text: 'en prise', term: 'en prise' });
    expect(parts[2]).toEqual({ text: ' après ce coup.' });
  });

  it('gère un texte sans terme', () => {
    expect(splitTip('Rien à signaler.')).toEqual([{ text: 'Rien à signaler.' }]);
  });

  it('gère un terme en fin de phrase', () => {
    const parts = splitTip('C’est [[échec et mat]]');
    expect(parts[parts.length - 1]).toEqual({ text: 'échec et mat', term: 'échec et mat' });
  });
});

describe('coachTip', () => {
  it('tient en une ou deux phrases', () => {
    const m = makeMove(START, 'e4', { classification: 'book' });
    const tip = coachTip(m);
    expect(tip.text.length).toBeLessThan(220);
    expect(tip.title).toBe(MOVE_CLASS_INFO.book.label);
  });

  it('n’emploie que des termes présents dans le glossaire', () => {
    const positions: [string, string, MoveClass][] = [
      [START, 'e4', 'book'],
      [START, 'e4', 'best'],
      [START, 'a3', 'inaccuracy'],
      [START, 'a3', 'mistake'],
      [START, 'a3', 'blunder'],
      [START, 'a3', 'miss'],
      [START, 'e4', 'brilliant'],
      [START, 'e4', 'excellent'],
      [START, 'e4', 'good'],
    ];
    for (const [fen, san, cls] of positions) {
      const tip = coachTip(makeMove(fen, san, { classification: cls, cpLoss: 300 }));
      for (const part of splitTip(tip.text)) {
        if (part.term) expect(GLOSSARY, `terme « ${part.term} » (${cls})`).toHaveProperty(part.term);
      }
    }
  });

  it('repère une fourchette de cavalier dans le meilleur coup manqué', () => {
    // Cavalier en e5 : Nc6 fourche la dame en d8 et la tour en a7.
    const fen = 'r2qkb1r/r6p/8/4N3/8/8/8/4K3 w - - 0 1';
    const m = makeMove(fen, 'Ke2', {
      classification: 'miss',
      bestMoveUci: 'e5c6',
      bestMoveSan: 'Nc6',
      cpBefore: 300,
      cpAfter: 50,
      cpLoss: 250,
    });
    expect(coachTip(m).text).toContain('[[fourchette]]');
  });

  it('annonce le mat forcé manqué', () => {
    const m = makeMove(START, 'a3', {
      classification: 'miss',
      cpBefore: 9990,
      cpAfter: 100,
      bestMoveSan: 'Qh5#',
      bestMoveUci: 'd1h5',
    });
    expect(coachTip(m).text).toContain('[[échec et mat]]');
  });

  it('ne propose pas d’alternative sur un meilleur coup ou un coup théorique', () => {
    expect(coachTip(makeMove(START, 'e4', { classification: 'best' })).betterUci).toBeNull();
    expect(coachTip(makeMove(START, 'e4', { classification: 'book' })).betterUci).toBeNull();
    expect(coachTip(makeMove(START, 'e4', { classification: 'blunder' })).betterUci).not.toBeNull();
  });
});

describe('evalChip', () => {
  const chip = (cpAfter: number, color: Color) =>
    evalChip(makeMove(START, 'e4', { cpAfter, color }));

  it('affiche l’éval du point de vue du joueur qui vient de jouer', () => {
    expect(chip(150, 'w')).toBe('+1.50');
    expect(chip(150, 'b')).toBe('−1.50');
    expect(chip(-80, 'b')).toBe('+0.80');
  });

  it('affiche le mat sans chiffre trompeur', () => {
    expect(chip(9999, 'w')).toBe('M');
    expect(chip(9999, 'b')).toBe('−M');
  });
});

// ------------------------------------------------------------------ Bilan

function fakeAnalysis(classes: MoveClass[]): GameAnalysis {
  const chess = new Chess();
  const moves: AnalyzedMove[] = classes.map((cls) => {
    const legal = chess.moves();
    const fenBefore = chess.fen();
    const mv = chess.move(legal[0]);
    return {
      san: mv.san,
      uci: mv.from + mv.to,
      color: mv.color,
      cpBefore: 0,
      cpAfter: 0,
      cpLoss: cls === 'blunder' ? 400 : cls === 'best' ? 0 : 80,
      classification: cls,
      bestMoveUci: mv.from + mv.to,
      bestMoveSan: mv.san,
      bestLineSan: [mv.san],
      refutationUci: '',
      accuracy: 90,
      fenBefore,
      fenAfter: chess.fen(),
    };
  });
  const empty = () =>
    Object.fromEntries(MOVE_CLASS_ORDER.map((c) => [c, 0])) as Record<MoveClass, number>;
  const counts = { w: empty(), b: empty() };
  for (const m of moves) counts[m.color][m.classification]++;
  return { moves, accuracy: { w: 80, b: 80 }, counts, initialCp: 0 };
}

describe('guidedStops', () => {
  it('s’arrête sur les coups marquants, pas sur toute la partie', () => {
    const a = fakeAnalysis([
      'book', 'book', 'book', 'book', // 0-3 : posent le décor
      'good', 'good', 'good', 'good', // ignorés
      'blunder', 'good', 'miss', 'good', 'brilliant', 'good',
    ]);
    const stops = guidedStops(a);
    expect(stops).toContain(8); // blunder
    expect(stops).toContain(10); // miss
    expect(stops).toContain(12); // brilliant
    expect(stops).not.toContain(5); // good banal
    expect(stops.length).toBeLessThan(a.moves.length);
  });

  it('termine toujours sur le dernier coup et reste trié', () => {
    const a = fakeAnalysis(['book', 'good', 'good', 'good', 'good', 'good']);
    const stops = guidedStops(a);
    expect(stops[stops.length - 1]).toBe(a.moves.length - 1);
    expect([...stops].sort((x, y) => x - y)).toEqual(stops);
  });

  it('ne garde qu’un camp quand on demande un focus', () => {
    const a = fakeAnalysis(['blunder', 'blunder', 'blunder', 'blunder', 'blunder', 'blunder']);
    expect(guidedStops(a, 'w').every((i) => a.moves[i].color === 'w')).toBe(true);
  });
});

describe('phaseRanges & phaseGrades', () => {
  it('découpe la partie en trois tranches contiguës', () => {
    const r = phaseRanges(40);
    expect(r.opening[0]).toBe(0);
    expect(r.opening[1]).toBe(r.middlegame[0]);
    expect(r.middlegame[1]).toBe(r.endgame[0]);
    expect(r.endgame[1]).toBe(40);
  });

  it('ne dépasse jamais le nombre de coups sur une partie courte', () => {
    const r = phaseRanges(3);
    expect(r.endgame[1]).toBe(3);
    expect(r.opening[1]).toBeLessThanOrEqual(3);
  });

  it('note chaque phase pour chaque camp', () => {
    const a = fakeAnalysis(Array<MoveClass>(12).fill('best'));
    const g = phaseGrades(a);
    expect(g.opening.w).toBe('best');
    expect(g.endgame.b).not.toBeNull();
  });

  it('laisse la phase vide quand aucun coup n’y a été joué', () => {
    const a = fakeAnalysis(['best']);
    expect(phaseGrades(a).endgame.b).toBeNull();
  });
});

describe('bookDepth', () => {
  it('reconnaît la théorie d’ouverture puis s’arrête', async () => {
    await loadOpenings();
    const italienne = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'];
    expect(bookDepth(italienne)).toBeGreaterThanOrEqual(4);
    expect(bookDepth(['a3', 'h6', 'a4', 'h5'])).toBeLessThan(4);
  });
});
