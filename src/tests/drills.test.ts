import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { DRILL_MODULES } from '../data/drills';

// Un défi faux est pire que pas de défi : Néo dirait au joueur qu'il a tort
// alors qu'il a raison. On vérifie donc chaque position au chargement du code.

const uci = (m: { from: string; to: string; promotion?: string }) => m.from + m.to + (m.promotion ?? '');

describe('modules de défis', () => {
  it('ont des identifiants uniques et au moins un défi chacun', () => {
    const ids = DRILL_MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of DRILL_MODULES) expect(m.challenges.length).toBeGreaterThan(0);
  });

  for (const module of DRILL_MODULES) {
    describe(module.id, () => {
      module.challenges.forEach((c, i) => {
        const label = `défi ${i + 1}`;

        it(`${label} : position valide et coups acceptés légaux`, () => {
          const chess = new Chess(c.fen);
          const legal = new Set(chess.moves({ verbose: true }).map(uci));
          expect(c.accepted.length).toBeGreaterThan(0);
          for (const move of c.accepted) expect(legal.has(move)).toBe(true);
          // La flèche de démonstration doit montrer une vraie solution.
          if (c.demo) expect(c.accepted).toContain(c.demo.from + c.demo.to);
        });

        it(`${label} : le camp au trait est en échec uniquement si c'est le sujet`, () => {
          expect(new Chess(c.fen).inCheck()).toBe(module.goal === 'escape');
        });

        if (module.goal === 'mate') {
          it(`${label} : les coups acceptés matent, et aucun autre mat n'est refusé`, () => {
            const chess = new Chess(c.fen);
            const mates = chess
              .moves({ verbose: true })
              .filter((m) => {
                const g = new Chess(c.fen);
                g.move(m.san);
                return g.isCheckmate();
              })
              .map(uci);
            expect([...mates].sort()).toEqual([...c.accepted].sort());
          });
        }

        if (module.goal === 'check') {
          it(`${label} : les coups acceptés donnent bien échec`, () => {
            for (const move of c.accepted) {
              const g = new Chess(c.fen);
              g.move(move);
              expect(g.inCheck()).toBe(true);
            }
          });
        }

        if (module.goal === 'capture' || module.goal === 'safe-capture') {
          it(`${label} : les coups acceptés capturent sans perdre de matériel`, () => {
            const value: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
            for (const move of c.accepted) {
              const g = new Chess(c.fen);
              const played = g.move(move);
              expect(played.captured).toBeTruthy();
              const recaptured = g.moves({ verbose: true }).some((r) => r.to === played.to);
              const gain = value[played.captured!] - (recaptured ? value[played.piece] : 0);
              expect(gain).toBeGreaterThanOrEqual(0);
            }
          });
        }
      });
    });
  }
});
