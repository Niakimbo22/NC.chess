import type { Chess, Square } from 'chess.js';

/**
 * Gestes de roque acceptés en plus de la case officielle du roi.
 *
 * Le roque se joue « roi sur deux cases » (e1→g1), mais presque personne ne le
 * fait comme ça : on attrape le roi et on le pose sur SA TOUR — c'est le geste
 * de l'échiquier réel, et celui que chess.com accepte. Sans cet alias, poser le
 * roi sur la tour ne faisait que sélectionner la tour : le roque paraissait
 * tout simplement cassé.
 *
 * Renvoie une table `case visée → case réelle du roi`. La colonne b est incluse
 * pour le grand roque (on vise souvent un cran trop loin) ; d1/d8 en revanche
 * reste un vrai coup de roi (Rd1), on n'y touche pas.
 */
export function castlingAliases(chess: Chess, from: Square): Map<Square, Square> {
  const map = new Map<Square, Square>();
  const piece = chess.get(from);
  if (!piece || piece.type !== 'k') return map;
  const rank = from[1];
  for (const m of chess.moves({ square: from, verbose: true })) {
    // Drapeaux chess.js : 'k' = petit roque, 'q' = grand roque.
    if (m.flags.includes('k')) {
      map.set(`h${rank}` as Square, m.to as Square);
    } else if (m.flags.includes('q')) {
      map.set(`a${rank}` as Square, m.to as Square);
      map.set(`b${rank}` as Square, m.to as Square);
    }
  }
  return map;
}
