// Néo ⚡ — la mascotte de NC.chess : un cavalier doré moderne, cool et direct
// (le « N » de NC.chess). Il accompagne le joueur, surtout dans les puzzles :
// il présente l'exercice, félicite, encourage après une erreur, glisse un
// indice… Bref, il donne une voix et une âme à l'app.

import type { Color } from 'chess.js';

export const NEO = {
  id: 'neo',
  name: 'Néo',
  emoji: '♞',
  // Avatar illustré (cavalier doré). Fallback emoji si l'image ne charge pas.
  avatar: `${import.meta.env.BASE_URL}icons/neo.svg`,
  tagline: 'Ton cavalier coach',
} as const;

export type NeoMood =
  | 'intro' // nouveau puzzle
  | 'solved' // résolu du premier coup
  | 'solvedAfterMiss' // résolu mais après une erreur
  | 'mistake' // mauvais coup (on peut réessayer)
  | 'hint' // le joueur demande un indice
  | 'solution' // le joueur abandonne / affiche la solution
  | 'streak' // série de bonnes réponses (palier)
  | 'welcome'; // salut général (accueil, début de session puzzle)

// Petites répliques variées, dans le ton de Néo : moderne, motivant, jamais
// culpabilisant. Émojis légers pour l'ambiance.
const LINES: Record<Exclude<NeoMood, 'intro'>, string[]> = {
  welcome: [
    'Prêt à t’entraîner ? On envoie du lourd. ⚡',
    'Salut ! Moi c’est Néo. On va faire chauffer les neurones. 🧠',
    'De retour ? Parfait. À nous deux les puzzles.',
    'En selle ! Chaque puzzle te rend plus fort. 🐴',
  ],
  solved: [
    'Boom ! Propre. Je savais que tu l’avais. ⚡',
    'Et voilà ! Coup parfait, on enchaîne ?',
    'Impeccable. T’as l’œil aujourd’hui. 👀',
    'Nickel ! C’était exactement ça. 🎯',
    'Classe. Tu montes en puissance. 📈',
  ],
  solvedAfterMiss: [
    'Voilà ! Tu l’as trouvé, c’est ça qui compte. 💪',
    'Bien rattrapé ! On retient l’idée pour la prochaine.',
    'Ça rentre ! L’important c’est que t’as pigé le motif. 🔑',
  ],
  mistake: [
    'Presque ! Reste calme et regarde encore. 🔍',
    'Pas tout à fait. Réessaie, t’es proche. ⚡',
    'Hop, pas celui-là. Y a mieux, cherche encore.',
    'Tranquille, respire. Le bon coup est là. 👌',
  ],
  hint: [
    'Indice : garde un œil par ici. 👀',
    'Concentre-toi sur cette pièce…',
    'Regarde bien de ce côté, la clé est là.',
    'Petit coup de pouce : commence par ça.',
  ],
  solution: [
    'Pas grave ! Regarde la solution et retiens le motif. 📚',
    'On apprend surtout de celles qu’on rate. Note l’idée !',
    'Voilà l’idée. La prochaine fois, tu la vois venir. 😉',
  ],
  streak: [
    'En feu ! 🔥 Continue comme ça.',
    'Série parfaite, tu déroules ! ⚡',
    'Machine à puzzles, respect. 🤖',
    'On ne t’arrête plus ! 🚀',
  ],
};

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Réplique de Néo pour un état donné. `intro` prend la couleur qui joue. */
export function neoSay(mood: NeoMood, color?: Color): string {
  if (mood === 'intro') {
    const side = color === 'w' ? 'les Blancs' : 'les Noirs';
    return pick([
      `À toi de jouer, ${side} gagnent. Trouve le coup ! ⚡`,
      `Ok focus. ${side} jouent et l’emportent. C’est parti.`,
      `${side} ont un coup gagnant. À toi de le dénicher. 👀`,
      `Ce puzzle a une solution nette. ${side} jouent, go !`,
    ]);
  }
  return pick(LINES[mood]);
}
