import { describe, expect, it } from 'vitest';
import { BOTS, botThinkDelay } from '../bots/bots';
import { shouldSpeak, speakableText, spokenNotation } from '../coach/voice';

// Un bot qui répond en 300 ms sur toute la partie casse l'illusion : on vérifie
// donc le rythme, pas seulement que la fonction renvoie un nombre.

const BOT = BOTS.find((b) => b.elo >= 500 && b.elo <= 900)!;
const OPENING = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1';
const MIDDLEGAME = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1';
const FORCED = '7k/6QP/8/8/8/8/8/K7 b - - 0 1';

function sample(fen: string, ply: number, remainingMs = 600_000): number[] {
  return Array.from({ length: 400 }, () =>
    botThinkDelay(BOT, { fen, ply, remainingMs })
  ).sort((a, b) => a - b);
}
const median = (xs: number[]) => xs[Math.floor(xs.length / 2)];

describe('temps de réflexion du bot', () => {
  it('ne répond jamais instantanément en milieu de partie', () => {
    const xs = sample(MIDDLEGAME, 14);
    expect(xs[0]).toBeGreaterThanOrEqual(550);
    // Un humain met plus d'une seconde sur une position ouverte.
    expect(median(xs)).toBeGreaterThan(1200);
  });

  it('enchaîne plus vite la théorie d’ouverture qu’un milieu de partie', () => {
    expect(median(sample(OPENING, 2))).toBeLessThan(median(sample(MIDDLEGAME, 14)));
  });

  it('joue du tac au tac quand un seul coup est légal', () => {
    const xs = sample(FORCED, 30);
    expect(xs[xs.length - 1]).toBeLessThan(700);
  });

  it('varie le rythme au lieu de servir une constante', () => {
    const xs = sample(MIDDLEGAME, 14);
    // Écart interquartile net : le rythme doit respirer.
    expect(xs[Math.floor(xs.length * 0.75)] - xs[Math.floor(xs.length * 0.25)]).toBeGreaterThan(300);
  });

  it('accélère quand la pendule est basse', () => {
    const calme = median(sample(MIDDLEGAME, 30, 600_000));
    const urgence = median(sample(MIDDLEGAME, 30, 20_000));
    expect(urgence).toBeLessThan(calme);
    expect(urgence).toBeLessThanOrEqual(800);
  });

  it('reste borné pour ne pas faire attendre le joueur', () => {
    expect(sample(MIDDLEGAME, 14).every((d) => d <= 7000)).toBe(true);
  });
});

describe('texte lu à voix haute', () => {
  it('retire les emoji au lieu de les prononcer', () => {
    expect(speakableText('Parfait. Tu vois loin aujourd’hui. 👀')).toBe(
      'Parfait. Tu vois loin aujourd’hui.'
    );
    expect(speakableText('C’est parti ! Amuse-toi. 🐴')).toBe('C’est parti ! Amuse-toi.');
    expect(speakableText('Bien joué 👏🎉 continue')).toBe('Bien joué continue');
  });

  it('ne renvoie rien pour un message purement emoji', () => {
    expect(speakableText('🎉🎉')).toBe('');
  });
});

describe('notation d’échecs prononçable', () => {
  it('nomme la pièce en figurine au lieu de l’escamoter', () => {
    expect(speakableText('♖xf5 est correct')).toBe('tour prend en f5 est correct');
    expect(speakableText('♞f6 tient le centre')).toBe('cavalier en f6 tient le centre');
  });

  it('traduit la notation algébrique', () => {
    expect(spokenNotation('Regarde plutôt du côté de Nxf5.')).toBe(
      'Regarde plutôt du côté de cavalier prend en f5.'
    );
    expect(spokenNotation('Joue Bc4')).toBe('Joue fou en c4');
    expect(spokenNotation('Qd1+')).toBe('dame en d1 échec');
    expect(spokenNotation('Qh7#')).toBe('dame en h7 échec et mat');
    expect(spokenNotation('exd5')).toBe('le pion e prend en d5');
    expect(spokenNotation('Nbd2')).toBe('cavalier de b en d2');
    expect(spokenNotation('e8=Q')).toBe('en e8 et devient dame');
  });

  it('dit les roques', () => {
    expect(spokenNotation('Pense à O-O')).toBe('Pense à petit roque');
    expect(spokenNotation('O-O-O est jouable')).toBe('grand roque est jouable');
  });

  it('laisse le français intact', () => {
    const phrases = [
      'Rien d’urgent : renforce ta position, double une tour sur une colonne ouverte.',
      'Attends ! Ce coup laisse ta dame en prise.',
      'Bien vu, on reprend. Prends ton temps.',
      'Échec ! À toi de parer.',
    ];
    for (const p of phrases) expect(spokenNotation(p)).toBe(p);
  });

  it('ne touche pas à une case citée seule', () => {
    expect(spokenNotation('Le pion arrive en e4 rapidement')).toBe(
      'Le pion arrive en e4 rapidement'
    );
  });
});

describe('quand Néo parle', () => {
  const off = { coachVoice: false, coachVoiceScope: 'key' as const };
  const key = { coachVoice: true, coachVoiceScope: 'key' as const };
  const all = { coachVoice: true, coachVoiceScope: 'all' as const };

  it('voix coupée : rien ne passe, même forcé', () => {
    expect(shouldSpeak(off)).toBe(false);
    expect(shouldSpeak(off, { important: true })).toBe(false);
    expect(shouldSpeak(off, { force: true })).toBe(false);
  });

  it('« quand ça compte » : l’essentiel et les boutons 🔊 seulement', () => {
    expect(shouldSpeak(key)).toBe(false);
    expect(shouldSpeak(key, { important: true })).toBe(true);
    expect(shouldSpeak(key, { force: true })).toBe(true);
  });

  it('« tout lire » : le bavardage passe aussi', () => {
    expect(shouldSpeak(all)).toBe(true);
  });
});
