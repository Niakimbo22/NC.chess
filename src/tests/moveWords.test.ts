import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { capitalize, moveWords, moveWordsFrom } from '../coach/moveWords';
import { speakableText } from '../coach/voice';

/** Position après les coups donnés (FEN d'avant le coup à décrire). */
function after(...sans: string[]): string {
  const chess = new Chess();
  for (const san of sans) chess.move(san);
  return chess.fen();
}

const START = new Chess().fen();

describe('moveWords', () => {
  it('décrit un coup de pion', () => {
    expect(moveWords(START, 'e4')).toBe('ton pion de e2 avance en e4 (e4)');
  });

  it('décrit un coup de pièce avec sa case de départ', () => {
    expect(moveWords(after('e4', 'e5'), 'Nf3')).toBe('ton cavalier de g1 va en f3 (Nf3)');
  });

  it('nomme la pièce capturée', () => {
    const fen = after('e4', 'e5', 'Nf3', 'Nc6', 'Bb5');
    expect(moveWords(fen, 'a6')).toBe('ton pion de a7 avance en a6 (a6)');
    expect(moveWords(after('e4', 'd5'), 'exd5')).toBe('ton pion de e4 prend le pion en d5 (exd5)');
  });

  it('dit le roque au lieu d’un déplacement de roi', () => {
    const fen = after('e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5');
    expect(moveWords(fen, 'O-O')).toBe('le petit roque (O-O)');
    const q = after('d4', 'd5', 'Nc3', 'Nc6', 'Bf4', 'Bf5', 'Qd2', 'Qd7');
    expect(moveWords(q, 'O-O-O')).toBe('le grand roque (O-O-O)');
  });

  it('annonce l’échec et le mat en toutes lettres', () => {
    const fen = after('f3', 'e5', 'g4');
    expect(moveWords(fen, 'Qh4#')).toBe('ta dame de d8 va en h4, échec et mat (Qh4#)');
    expect(moveWords(after('e4', 'e5', 'Bc4', 'Nc6', 'Qf3', 'd6'), 'Qxf7#'))
      .toBe('ta dame de f3 prend le pion en f7, échec et mat (Qxf7#)');
  });

  it('explique la promotion et la prise en passant', () => {
    expect(moveWords('8/4P3/8/8/8/8/6k1/K7 w - - 0 1', 'e8=Q'))
      .toBe('ton pion de e7 avance en e8 et devient une dame (e8=Q)');
    expect(moveWords('3r4/4P3/8/8/8/8/6k1/K7 w - - 0 1', 'exd8=Q'))
      .toBe('ton pion de e7 prend la tour en d8 et devient une dame (exd8=Q)');
    expect(moveWords('rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3', 'exf6'))
      .toBe('ton pion de e5 prend en passant, en f6 (exf6)');
  });

  it('accepte aussi la notation UCI du moteur', () => {
    expect(moveWords(START, 'g1f3')).toBe('ton cavalier de g1 va en f3 (Nf3)');
  });

  it('sait parler d’un coup qui n’est pas le tien', () => {
    expect(moveWords(START, 'e4', { subject: 'neutral' })).toBe('le pion de e2 avance en e4 (e4)');
  });

  it('peut se passer de la notation, ou en afficher une autre', () => {
    expect(moveWords(START, 'e4', { withSan: false })).toBe('ton pion de e2 avance en e4');
    const mv = new Chess().move('Nf3');
    expect(moveWordsFrom(mv, { san: '♘f3' })).toBe('ton cavalier de g1 va en f3 (♘f3)');
  });

  it('renvoie null sur un coup impossible plutôt que d’inventer', () => {
    expect(moveWords(START, 'Qxe6')).toBeNull();
  });

  it('met la majuscule pour ouvrir une phrase', () => {
    expect(capitalize('ton pion de e2 avance en e4')).toBe('Ton pion de e2 avance en e4');
  });
});

describe('lecture à voix haute d’un coup décrit', () => {
  it('ne répète pas la notation rappelée entre parenthèses', () => {
    const text = `À la place, regarde ça : ${moveWords(START, 'e4')}.`;
    expect(speakableText(text)).toBe('À la place, regarde ça : ton pion de e2 avance en e4.');
  });

  it('retire aussi le roque et la notation figurine', () => {
    expect(speakableText('Bien joué : le petit roque (O-O).')).toBe('Bien joué : le petit roque.');
    expect(speakableText('Le cavalier prend en f5 (♘xf5).')).toBe('Le cavalier prend en f5.');
  });

  it('laisse intacte une parenthèse qui n’est pas de la notation', () => {
    expect(speakableText('Un coup solide (rien de grave).')).toBe('Un coup solide (rien de grave).');
    // Les cases citées seules restent telles quelles : « e4 » n'est pas un coup identifiable.
    expect(speakableText('La suite : e4 e5 Nf3.')).toBe('La suite : e4 e5 cavalier en f3.');
  });
});
