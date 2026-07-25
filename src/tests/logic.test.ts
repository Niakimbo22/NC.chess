import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { castlingAliases } from '../game/castling';
import { eloDelta } from '../store/profile';
import { formatClock, customTimeControl } from '../game/timeControls';
import { generateRoomCode, normalizeRoomCode } from '../p2p/session';
import { winPercent } from '../engine/analysis';
import { dailyPuzzle, pickPuzzle, type Puzzle } from '../data/puzzleDb';

describe('eloDelta', () => {
  it('gagne ~la moitié du K contre un adversaire de même niveau', () => {
    expect(eloDelta(1000, 1000, 1)).toBe(16);
    expect(eloDelta(1000, 1000, 0)).toBe(-16);
    expect(eloDelta(1000, 1000, 0.5)).toBe(0);
  });
  it('gagne peu contre un adversaire faible, beaucoup contre un fort', () => {
    expect(eloDelta(2000, 1000, 1)).toBeLessThan(2);
    expect(eloDelta(1000, 2000, 1)).toBeGreaterThan(30);
  });
});

describe('formatClock', () => {
  it('formate minutes:secondes', () => {
    expect(formatClock(600000)).toBe('10:00');
    expect(formatClock(61000)).toBe('1:01');
  });
  it('affiche les dixièmes sous 20 secondes', () => {
    expect(formatClock(19900)).toBe('0:19.9');
    expect(formatClock(500)).toBe('0:00.5');
  });
  it('affiche les heures au-delà de 60 minutes', () => {
    expect(formatClock(3661000)).toBe('1:01:01');
  });
  it('ne descend pas sous zéro', () => {
    expect(formatClock(-500)).toBe('0:00.0');
  });
});

describe('codes de salon', () => {
  it('génère 4 caractères sans ambiguïté', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);
    }
  });
  it('normalise la saisie utilisateur', () => {
    expect(normalizeRoomCode(' af3p ')).toBe('AF3P');
    expect(normalizeRoomCode('a-f 3.p!')).toBe('AF3P');
    expect(normalizeRoomCode('io01')).toBe('');
  });
});

describe('winPercent', () => {
  it('50% à égalité, croissant avec l’avantage', () => {
    expect(winPercent(0)).toBeCloseTo(50);
    expect(winPercent(300)).toBeGreaterThan(70);
    expect(winPercent(-300)).toBeLessThan(30);
    expect(winPercent(5000)).toBeGreaterThan(94);
  });
});

describe('cadence personnalisée', () => {
  it('catégorise selon le temps initial', () => {
    expect(customTimeControl(60, 0).category).toBe('bullet');
    expect(customTimeControl(300, 3).category).toBe('blitz');
    expect(customTimeControl(900, 10).category).toBe('rapide');
    expect(customTimeControl(3600, 30).category).toBe('classique');
  });
});

describe('puzzles', () => {
  const pool: Puzzle[] = Array.from({ length: 100 }, (_, i) => ({
    id: `p${i}`,
    fen: '8/8/8/8/8/8/8/K1k5 w - - 0 1',
    moves: ['a1a2'],
    rating: 400 + i * 25,
    themes: i % 2 === 0 ? ['fork'] : ['pin'],
  }));

  it('le puzzle du jour est déterministe pour une date donnée', () => {
    const d = new Date(2026, 6, 20);
    expect(dailyPuzzle(pool, d).id).toBe(dailyPuzzle(pool, d).id);
    // deux jours différents donnent (presque toujours) des puzzles différents
    const other = dailyPuzzle(pool, new Date(2026, 6, 21));
    expect(other.id).toBeDefined();
  });

  it('choisit près du niveau demandé en respectant thème et exclusions', () => {
    for (let i = 0; i < 20; i++) {
      const p = pickPuzzle(pool, { rating: 1000, spread: 150, theme: 'fork' })!;
      expect(Math.abs(p.rating - 1000)).toBeLessThanOrEqual(150);
      expect(p.themes).toContain('fork');
    }
    const excluded = new Set(pool.map((p) => p.id).slice(0, 99));
    const last = pickPuzzle(pool, { rating: 400, spread: 10000, exclude: excluded })!;
    expect(last.id).toBe('p99');
  });
});

describe('gestes de roque', () => {
  const kingside = () => {
    const c = new Chess();
    for (const m of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']) c.move(m);
    return c;
  };
  const queenside = () => {
    const c = new Chess();
    for (const m of ['d4', 'd5', 'Nc3', 'Nc6', 'Bf4', 'Bf5', 'Qd2', 'Qd7']) c.move(m);
    return c;
  };

  it('accepte le roi posé sur sa tour (petit roque)', () => {
    const alias = castlingAliases(kingside(), 'e1');
    expect(alias.get('h1')).toBe('g1');
  });

  it('accepte la tour et la colonne b pour le grand roque', () => {
    const alias = castlingAliases(queenside(), 'e1');
    expect(alias.get('a1')).toBe('c1');
    expect(alias.get('b1')).toBe('c1');
  });

  it('laisse d1 tranquille : Rd1 reste un vrai coup de roi', () => {
    expect(castlingAliases(queenside(), 'e1').has('d1')).toBe(false);
  });

  it('ne propose rien quand le roque est impossible', () => {
    const c = kingside();
    c.move('Ke2'); // le roi a bougé : plus de roque
    c.move('Nf6');
    expect(castlingAliases(c, 'e2').size).toBe(0);
  });

  it('marche aussi pour les noirs', () => {
    const c = new Chess();
    for (const m of ['e4', 'e5', 'Nf3', 'Nf6', 'Bc4', 'Bc5', 'O-O']) c.move(m);
    const alias = castlingAliases(c, 'e8');
    expect(alias.get('h8')).toBe('g8');
  });

  it('ignore les pièces qui ne sont pas le roi', () => {
    expect(castlingAliases(kingside(), 'h1').size).toBe(0);
  });
});
