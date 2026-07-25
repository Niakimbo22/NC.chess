// Mode « Jouer contre Néo » — le cœur éducatif de NC.chess.
//
// Néo, le cavalier doré, n'est pas un adversaire comme les autres : il joue
// contre toi MAIS il t'accompagne. Selon le niveau choisi, il te prévient
// avant une gaffe, te félicite d'un bon coup, glisse un plan, et répond quand
// tu lui demandes un conseil. Ce module rassemble les niveaux de Néo (force +
// intensité pédagogique) et toutes ses répliques de coaching.

import type { Bot } from '../bots/bots';
import type { Color } from 'chess.js';

// Intensité de l'accompagnement :
//  - full   : prévient dès la moindre erreur, commente souvent (grand débutant)
//  - strong : prévient des vraies gaffes, encourage régulièrement
//  - light  : ne prévient que des catastrophes, commentaires rares
//  - off    : aucune interruption — le vrai défi (conseils à la demande seulement)
export type NeoGuidance = 'full' | 'strong' | 'light' | 'off';

export interface NeoLevel {
  id: string;
  name: string;
  elo: number;
  /** Étiquette courte du « style » de Néo à ce niveau. */
  style: string;
  /** Ce que Néo fait pour toi à ce niveau (affiché dans le sélecteur). */
  teaching: string;
  guidance: NeoGuidance;
  /** Configuration moteur, compatible avec toute la machinerie des bots. */
  bot: Bot;
}

const AVATAR = '♞';

// Les 5 visages de Néo, du mentor tout-terrain au maître intraitable. Les
// réglages moteur reprennent les profils éprouvés des bots pour un jeu humain.
export const NEO_LEVELS: NeoLevel[] = [
  {
    id: 'neo-eveil',
    name: 'Néo Éveil',
    elo: 600,
    style: 'Mentor patient',
    teaching: 'Je t’explique tout et je te préviens avant chaque erreur. Idéal pour débuter sans stress.',
    guidance: 'full',
    bot: {
      id: 'neo-eveil', name: 'Néo Éveil', elo: 600, avatar: AVATAR,
      description: 'Néo joue en douceur et t’accompagne pas à pas.', style: 'Mentor patient',
      settings: { skill: 1, depth: 3, temperature: 160, blunderChance: 0.22, grabInstinct: 0.9 },
    },
  },
  {
    id: 'neo-apprenti',
    name: 'Néo Apprenti',
    elo: 1000,
    style: 'Coach attentif',
    teaching: 'Je te préviens avant les grosses fautes et je commente tes bons coups.',
    guidance: 'full',
    bot: {
      id: 'neo-apprenti', name: 'Néo Apprenti', elo: 1000, avatar: AVATAR,
      description: 'Néo repère les tactiques simples et reste pédago.', style: 'Coach attentif',
      settings: { skill: 3, depth: 5, temperature: 120, blunderChance: 0.06 },
    },
  },
  {
    id: 'neo-tacticien',
    name: 'Néo Tacticien',
    elo: 1400,
    style: 'Duelliste malin',
    teaching: 'Je t’alerte des vraies gaffes et je souligne les motifs tactiques.',
    guidance: 'strong',
    bot: {
      id: 'neo-tacticien', name: 'Néo Tacticien', elo: 1400, avatar: AVATAR,
      description: 'Néo cherche les combinaisons et punit les distractions.', style: 'Duelliste malin',
      settings: { uciElo: 1400, movetime: 650 },
    },
  },
  {
    id: 'neo-stratege',
    name: 'Néo Stratège',
    elo: 1800,
    style: 'Fin manœuvrier',
    teaching: 'Peu d’aide : je ne t’arrête que sur une catastrophe. À toi de réfléchir.',
    guidance: 'light',
    bot: {
      id: 'neo-stratege', name: 'Néo Stratège', elo: 1800, avatar: AVATAR,
      description: 'Néo joue avec un plan et exploite tes faiblesses.', style: 'Fin manœuvrier',
      settings: { uciElo: 1800, movetime: 850 },
    },
  },
  {
    id: 'neo-maitre',
    name: 'Néo Maître',
    elo: 2400,
    style: 'Adversaire redoutable',
    teaching: 'Aucun filet. Le vrai défi — je ne conseille que si tu le demandes.',
    guidance: 'off',
    bot: {
      id: 'neo-maitre', name: 'Néo Maître', elo: 2400, avatar: AVATAR,
      description: 'Néo à pleine lucidité. Chaque erreur se paie.', style: 'Adversaire redoutable',
      settings: { uciElo: 2400, movetime: 1000 },
    },
  },
];

export function getNeoLevel(id: string): NeoLevel | undefined {
  return NEO_LEVELS.find((l) => l.id === id);
}

// Seuil de perte (centipions, point de vue du joueur) au-delà duquel Néo
// interrompt pour prévenir, selon l'intensité pédagogique choisie.
export function warnThreshold(g: NeoGuidance): number {
  switch (g) {
    case 'full': return 130;
    case 'strong': return 260;
    case 'light': return 450;
    case 'off': return Infinity;
  }
}

export type PlayerMoveClass = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

/** Classe le coup du joueur selon la perte en centipions par rapport au meilleur. */
export function classifyLoss(cpLoss: number): PlayerMoveClass {
  if (cpLoss <= 20) return 'best';
  if (cpLoss <= 90) return 'good';
  if (cpLoss <= 180) return 'inaccuracy';
  if (cpLoss <= 350) return 'mistake';
  return 'blunder';
}

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Salutation d'ouverture. */
export function neoStart(level: NeoLevel, playerColor: Color): string {
  const side = playerColor === 'w' ? 'les Blancs' : 'les Noirs';
  return pick([
    `En selle ! Tu as ${side}, moi le reste. Joue posément, je veille. ⚡`,
    `C’est parti ! Tu prends ${side}. Développe, occupe le centre, et amuse-toi. 🐴`,
    `${level.name} à ton service. Tu joues ${side} — montre-moi ce que tu sais faire !`,
    `On y va : ${side} à toi. Respire, réfléchis, et surtout, apprends. 🧠`,
  ]);
}

/** Félicitation quand le joueur trouve un bon / le meilleur coup. */
export function neoPraise(cls: 'best' | 'good'): string {
  if (cls === 'best') {
    return pick([
      'Le meilleur coup ! Pile ce que j’aurais joué. ⚡',
      'Parfait. Tu vois loin aujourd’hui. 👀',
      'Impeccable, c’était LE coup. 🎯',
      'Boom. Précision de maître. 🔥',
    ]);
  }
  return pick([
    'Solide, bien joué. 👍',
    'Bon coup, tu gardes le fil.',
    'Ça tient la route, on continue.',
    'Propre. Reste concentré.',
  ]);
}

/** Petit mot bienveillant sur une imprécision (sans interrompre). */
export function neoNudge(): string {
  return pick([
    'Imprécision, mais rien de grave. Recentre-toi. 🙂',
    'Un chouïa mieux était possible — on note et on avance.',
    'Presque optimal. Regarde tes pièces actives la prochaine fois.',
  ]);
}

/**
 * Avertissement AVANT de valider une gaffe (boîte de dialogue). `reason` décrit
 * ce qui cloche (ex. « ça laisse ta dame en prise ») quand on a pu le détecter,
 * et `better` le meilleur coup en notation lisible.
 */
export function neoWarn(cls: 'mistake' | 'blunder', reason?: string, better?: string): string {
  const head = cls === 'blunder'
    ? pick(['Attends ! 😮', 'Stop, une seconde ⚠️', 'Hmm, attention…'])
    : pick(['Hmm, tu es sûr ?', 'Attends voir…', 'Réfléchis encore un peu.']);
  const body = reason
    ? ` Ce coup ${reason}.`
    : cls === 'blunder'
      ? ' Ce coup perd gros.'
      : ' Il y a bien mieux ici.';
  const tail = better ? ` Regarde plutôt du côté de ${better}.` : ' Tu veux vraiment le jouer ?';
  return head + body + tail;
}

/** Réaction de Néo après SON propre coup (bavardage léger). */
export function neoAfterOwnMove(kind: 'check' | 'capture' | 'advantage' | 'normal'): string {
  switch (kind) {
    case 'check': return pick(['Échec ! À toi de parer. ⚡', 'Ton roi est visé — attention.', 'Échec ! Comment tu réponds ?']);
    case 'capture': return pick(['Je prends ça. 😏', 'Merci pour la pièce !', 'Hop, dans ma poche.']);
    case 'advantage': return pick(['Je mène — mais rien n’est joué. 💪', 'Ça pousse de mon côté. Tiens bon !']);
    default: return pick(['À toi.', 'Ton tour.', 'Montre-moi.']);
  }
}

/** Ligne courte qui accompagne un indice fléché sur l'échiquier. */
export function neoBoardHint(): string {
  return pick([
    'Regarde la flèche dorée — c’est la piste. ✨',
    'Voilà où je jouerais. À toi de comprendre pourquoi. 🤔',
    'Indice sur l’échiquier : suis la flèche. ⚡',
    'La clé est là. Fais-toi confiance.',
  ]);
}

export interface AdviceContext {
  /** Éval en centipions, point de vue du joueur (positif = le joueur mène). */
  cp: number;
  inCheck: boolean;
  moveCount: number;
  pieceCount: number;
}

/** Conseil textuel de Néo (« demander conseil ») adapté à la position. */
export function neoAdvice(ctx: AdviceContext): string {
  if (ctx.inCheck) {
    return pick([
      'Tu es en échec : parer la menace passe avant tout. Bouge le roi, bloque, ou capture l’attaquant.',
      'Échec ! Ne panique pas. Regarde tes trois options : fuir, bloquer, capturer.',
    ]);
  }
  if (ctx.moveCount < 12) {
    return pick([
      'Début de partie : sors tes pièces (cavaliers puis fous), occupe le centre, et roque tôt pour mettre ton roi à l’abri.',
      'Priorité à l’ouverture : développe, ne sors pas ta dame trop tôt, et pense au roque.',
    ]);
  }
  if (ctx.cp <= -300) {
    return pick([
      'Tu es sous pression. Solidifie ta position, échange les attaquants adverses et cherche du contre-jeu — chaque ressource compte.',
      'Position difficile : ne te décourage pas. Vise les complications, crée des menaces, et surveille les tactiques adverses.',
    ]);
  }
  if (ctx.cp >= 300) {
    return pick([
      'Tu as l’avantage ! Ne te précipite pas : échange les pièces pour simplifier vers une finale gagnante.',
      'Belle position. Consolide, garde ton roi en sécurité, et convertis ton avantage calmement.',
    ]);
  }
  if (ctx.pieceCount <= 12) {
    return pick([
      'On est en finale : active ton roi, il devient une pièce forte, et pousse tes pions passés.',
      'Finale : le roi doit avancer, et chaque pion compte. Cherche à en promouvoir un.',
    ]);
  }
  return pick([
    'Position équilibrée. Améliore ta pièce la moins active et choisis une aile où lancer un plan.',
    'Milieu de partie serré : cherche les cases faibles adverses et coordonne tes pièces avant d’attaquer.',
    'Rien d’urgent : renforce ta position, double une tour sur une colonne ouverte, et prépare l’avancée.',
  ]);
}

/** Mot de la fin. */
export function neoEnd(outcome: 'win' | 'loss' | 'draw'): string {
  switch (outcome) {
    case 'win': return pick([
      'Tu m’as battu ! Bravo, c’est mérité. 🏆 On rejoue ?',
      'Chapeau ! Tu progresses vite. Fier de toi. ⚡',
      'Victoire nette. Tu montes en puissance. 🔥',
    ]);
    case 'loss': return pick([
      'Bien joué quand même — analyse la partie, c’est là qu’on apprend. 📚',
      'Pas cette fois, mais tu as tenu ! Regarde où ça a basculé, et reviens plus fort. 💪',
      'C’est en perdant qu’on devient bon. On rejoue et on corrige ?',
    ]);
    case 'draw': return pick([
      'Partie nulle — accrochée ! Beau combat. 🤝',
      'Égalité : tu m’as tenu tête. Solide.',
    ]);
  }
}
