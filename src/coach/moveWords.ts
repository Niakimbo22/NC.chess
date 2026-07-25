import { Chess, type Move } from 'chess.js';

/**
 * Traduit un coup en français clair.
 *
 * « Qxe6 » ne veut rien dire quand on apprend : c'est une abréviation anglaise
 * (Q = Queen), écrite sans un seul mot de français. Quand Néo conseille un coup
 * ou commente le tien, il dit maintenant ce qui se passe sur l'échiquier —
 * « ta dame de d1 prend le fou en e6 » — et ne garde la notation qu'entre
 * parenthèses, pour ceux qui veulent l'apprendre au passage.
 *
 * La notation entre parenthèses est retirée avant la lecture à voix haute
 * (voir `speakableText`) : l'entendre épeler serait exactement le charabia
 * qu'on cherche à éviter.
 */

const MY_PIECE: Record<string, string> = {
  p: 'ton pion', n: 'ton cavalier', b: 'ton fou', r: 'ta tour', q: 'ta dame', k: 'ton roi',
};
const THE_PIECE: Record<string, string> = {
  p: 'le pion', n: 'le cavalier', b: 'le fou', r: 'la tour', q: 'la dame', k: 'le roi',
};
// Pièce capturée : toujours « le/la », c'est celle d'en face.
const TAKEN_PIECE: Record<string, string> = {
  p: 'le pion', n: 'le cavalier', b: 'le fou', r: 'la tour', q: 'la dame', k: 'le roi',
};
const PROMOTED_TO: Record<string, string> = {
  q: 'une dame', r: 'une tour', b: 'un fou', n: 'un cavalier',
};

export interface MoveWordsOptions {
  /** 'you' (défaut) : « ta dame… ». 'neutral' : « la dame… » (coup d'un tiers). */
  subject?: 'you' | 'neutral';
  /** Rappeler la notation entre parenthèses (défaut : oui). */
  withSan?: boolean;
  /** Notation à afficher, si l'on veut autre chose que le SAN (ex. figurine). */
  san?: string;
}

/** Décrit un objet `Move` de chess.js en français clair. */
export function moveWordsFrom(mv: Move, options: MoveWordsOptions = {}): string {
  const mine = options.subject !== 'neutral';
  const noun = (type: string) => (mine ? MY_PIECE[type] : THE_PIECE[type]);
  const notation = options.withSan === false ? '' : ` (${options.san ?? mv.san})`;
  const suffix = mv.san.includes('#')
    ? ', échec et mat'
    : mv.san.includes('+')
      ? ', avec échec'
      : '';

  let body: string;
  if (mv.flags.includes('k')) {
    body = 'le petit roque';
  } else if (mv.flags.includes('q')) {
    body = 'le grand roque';
  } else {
    const subject = `${noun(mv.piece)} de ${mv.from}`;
    if (mv.flags.includes('e')) {
      body = `${subject} prend en passant, en ${mv.to}`;
    } else if (mv.captured) {
      body = `${subject} prend ${TAKEN_PIECE[mv.captured]} en ${mv.to}`;
    } else if (mv.piece === 'p') {
      body = `${subject} avance en ${mv.to}`;
    } else {
      body = `${subject} va en ${mv.to}`;
    }
    if (mv.promotion) body += ` et devient ${PROMOTED_TO[mv.promotion] ?? 'une dame'}`;
  }

  return `${body}${suffix}${notation}`;
}

/**
 * Décrit un coup donné en SAN (« Qxe6 ») ou en UCI (« d1e6 ») depuis la
 * position qui le précède. Renvoie `null` si le coup n'est pas jouable ici.
 */
export function moveWords(fenBefore: string, move: string, options: MoveWordsOptions = {}): string | null {
  const played = playMove(fenBefore, move);
  return played ? moveWordsFrom(played, options) : null;
}

function playMove(fen: string, move: string): Move | null {
  try {
    return new Chess(fen).move(move);
  } catch {
    try {
      return new Chess(fen).move({
        from: move.slice(0, 2),
        to: move.slice(2, 4),
        promotion: move.length > 4 ? (move[4] as Move['promotion']) : undefined,
      });
    } catch {
      return null;
    }
  }
}

/** Met la première lettre en majuscule (le coup ouvre souvent la phrase). */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
