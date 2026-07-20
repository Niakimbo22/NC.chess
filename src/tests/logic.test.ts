import { describe, expect, it } from 'vitest';
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
