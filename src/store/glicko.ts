// Système de classement Glicko-1 — le VRAI système utilisé par chess.com.
//
// Contrairement à l'Elo classique (facteur K fixe), Glicko attache à chaque
// rating un « Rating Deviation » (RD) : l'incertitude sur la vraie force du
// joueur. Un rating tout neuf a un RD élevé (350) et bouge énormément (le
// classement se cale vite) ; un rating établi a un RD faible et bouge peu.
// L'ampleur d'une variation dépend AUSSI du RD de l'adversaire : battre un
// adversaire dont le rating est très fiable (RD faible) rapporte un gain net
// et bien calibré.
//
// Réf. : Mark Glickman, « The Glicko system » — http://www.glicko.net/glicko/glicko.pdf

/** Rating Deviation d'un classement tout neuf : incertitude maximale. */
export const DEFAULT_RD = 350;
/** Plancher du RD : un rating ne se fige jamais totalement, il peut toujours bouger. */
export const MIN_RD = 30;
/**
 * En dessous de ce RD, on considère le rating comme fiable ; au-dessus il est
 * « provisoire » (encore en cours de calibrage, gros mouvements).
 */
export const PROVISIONAL_RD = 110;
/**
 * Constante d'inflation du RD par jour d'inactivité. Choisie pour qu'un rating
 * bien établi (RD ~50) remonte à l'incertitude maximale (350) après ~1 an sans
 * jouer : c² = (350² − 50²) / 365 ⇒ c ≈ 18.1.
 */
const C_PER_DAY = 18.1;

/** q = ln(10)/400, la constante d'échelle du système. */
const Q = Math.LN10 / 400;

export interface Rating {
  /** Estimation de la force, sur l'échelle Elo habituelle. */
  rating: number;
  /** Rating Deviation : l'incertitude (1 écart-type) sur ce rating. */
  rd: number;
}

/**
 * Facteur d'atténuation lié à l'incertitude d'un adversaire : plus le RD de
 * l'adversaire est grand, moins la partie pèse sur le rating.
 */
function g(rd: number): number {
  return 1 / Math.sqrt(1 + (3 * Q * Q * rd * rd) / (Math.PI * Math.PI));
}

/** Score attendu du joueur (probabilité de victoire, 0..1) face à un adversaire. */
export function expectedScore(rating: number, oppRating: number, oppRd: number): number {
  return 1 / (1 + Math.pow(10, (-g(oppRd) * (rating - oppRating)) / 400));
}

/**
 * Gonfle le RD selon le temps d'inactivité (en jours). Plus on reste longtemps
 * sans jouer, moins le rating est fiable — donc plus il rebougera vite au retour.
 * Le RD est plafonné à DEFAULT_RD.
 */
export function inflateRd(rd: number, daysInactive: number): number {
  if (daysInactive <= 0) return rd;
  return Math.min(Math.sqrt(rd * rd + C_PER_DAY * C_PER_DAY * daysInactive), DEFAULT_RD);
}

/**
 * Met à jour le rating Glicko du joueur après UNE partie.
 *
 * @param player   rating + RD du joueur avant la partie
 * @param opponent rating + RD de l'adversaire (un bot calibré a un RD faible)
 * @param score    1 = victoire, 0.5 = nulle, 0 = défaite
 * @returns le nouveau rating + RD (RD borné entre MIN_RD et DEFAULT_RD)
 */
export function updateRating(player: Rating, opponent: Rating, score: number): Rating {
  const e = expectedScore(player.rating, opponent.rating, opponent.rd);
  const gOpp = g(opponent.rd);
  // 1/d² : information apportée par cette partie (nulle si l'issue était certaine).
  const invDSquared = Q * Q * gOpp * gOpp * e * (1 - e);
  const invRdSquared = 1 / (player.rd * player.rd);
  const denom = invRdSquared + invDSquared;

  const newRating = player.rating + (Q / denom) * gOpp * (score - e);
  const newRd = Math.sqrt(1 / denom);

  return {
    rating: newRating,
    rd: Math.max(MIN_RD, Math.min(DEFAULT_RD, newRd)),
  };
}
