import { useSettings, type VoiceScope } from '../store/settings';

/**
 * Synthèse vocale du coach. Sélectionne automatiquement la meilleure voix
 * française disponible sur le système : les voix « naturelles / premium »
 * des OS récents sont préférées aux voix robotiques de base.
 *
 * Attention : les voix ne viennent PAS de l'application, mais du moteur de
 * synthèse du téléphone. On ne peut donc que choisir la moins mauvaise, adoucir
 * la prosodie, et surtout lui donner un texte prononçable — c'est là que se
 * jouait l'essentiel du « c'est insupportable ».
 */

let cachedVoice: SpeechSynthesisVoice | null = null;

// Voix réellement expressives, par ordre de préférence. Les voix neurales des
// OS récents d'abord, puis les voix système françaises de bonne facture.
const PREFERRED_PATTERNS = [
  /neural|natural/i, // Edge/Windows, Android récents
  /premium|enhanced|améliorée/i, // iOS/macOS haute qualité
  /siri/i,
  /wavenet|studio|journey/i, // voix neurales cloud
  /audrey|aurélie|marie|thomas|amélie|daniel/i, // voix système françaises nommées
  /samsung|bixby/i,
  /microsoft|denise|henri/i,
];

// Voix à éviter : timbre plat et robotique. La synthèse Google (« Google
// français ») en fait partie — c'est le rendu monocorde qu'on ne veut pas.
const REJECTED_PATTERNS = [/google/i, /espeak|pico|compact|eloquence/i];

function score(voice: SpeechSynthesisVoice): number {
  if (REJECTED_PATTERNS.some((p) => p.test(voice.name))) return -1;
  const rank = PREFERRED_PATTERNS.findIndex((p) => p.test(voice.name));
  return rank === -1 ? PREFERRED_PATTERNS.length : rank;
}

export function pickFrenchVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;
  const preferredName = useSettings.getState().coachVoiceName;
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('fr'));
  if (voices.length === 0) return null;
  // Un choix explicite dans les réglages prime toujours.
  if (preferredName) {
    const chosen = voices.find((v) => v.name === preferredName);
    if (chosen) return chosen;
  }
  const ranked = voices
    .map((v) => ({ v, s: score(v) }))
    .filter((e) => e.s >= 0)
    .sort((a, b) => a.s - b.s);
  // Toutes rejetées : on prend quand même la moins pire plutôt que le silence.
  if (ranked.length === 0) return voices.find((v) => v.default) ?? voices[0];
  return ranked[0].v;
}

/**
 * La voix retenue est-elle une voix qu'on juge robotique ? Sert à l'expliquer
 * dans les réglages : sans ça, on rejette « Google français » en interne mais on
 * la joue quand même faute de mieux, et l'utilisateur ne comprend pas pourquoi.
 */
export function voiceIsRobotic(): boolean {
  if (!('speechSynthesis' in window)) return false;
  const v = cachedVoice ?? pickFrenchVoice();
  return v != null && REJECTED_PATTERNS.some((p) => p.test(v.name));
}

/** Nom de la voix effectivement utilisée (pour l'afficher dans les réglages). */
export function currentVoiceName(): string | null {
  if (!('speechSynthesis' in window)) return null;
  return (cachedVoice ?? pickFrenchVoice())?.name ?? null;
}

const PIECE_WORD: Record<string, string> = {
  K: 'roi', Q: 'dame', R: 'tour', B: 'fou', N: 'cavalier',
};
const FIGURINE_WORD: Record<string, string> = {
  '♔': 'roi', '♚': 'roi',
  '♕': 'dame', '♛': 'dame',
  '♖': 'tour', '♜': 'tour',
  '♗': 'fou', '♝': 'fou',
  '♘': 'cavalier', '♞': 'cavalier',
  '♙': 'pion', '♟': 'pion',
};
// Lettre algébrique de chaque figurine. Le pion n'en a pas : il est traité à part.
const FIGURINE_SAN: Record<string, string> = {
  '♔': 'K', '♚': 'K', '♕': 'Q', '♛': 'Q', '♖': 'R',
  '♜': 'R', '♗': 'B', '♝': 'B', '♘': 'N', '♞': 'N',
};

// Un coup en notation algébrique complet : pièce, case de départ facultative,
// prise, case d'arrivée, promotion, échec/mat. La fin est un `(?!\w)` et non un
// `\b` : après un « + » ou un « # » suivi d'une espace il n'y a pas de frontière
// de mot, et le suffixe se faisait rejeter — « Dd1+ » perdait son échec, qui
// repartait ensuite en « plus » à la lecture.
const SAN_RE = /\b([KQRBN])?([a-h])?([1-8])?(x)?([a-h][1-8])(?:=([QRBN]))?([+#])?(?!\w)/g;

/**
 * Traduit la notation d'échecs en français parlé. Sans ça la synthèse ânonne
 * « enn iks eff cinq » pour « Nxf5 », ou « o tiret o » pour un roque : c'est le
 * genre de charabia qui rend la voix insupportable.
 */
export function spokenNotation(text: string): string {
  let out = text;
  // Les roques d'abord : « O-O-O » contient « O-O ».
  out = out.replace(/\bO-O-O\b/g, 'grand roque').replace(/\b0-0-0\b/g, 'grand roque');
  out = out.replace(/\bO-O\b/g, 'petit roque').replace(/\b0-0\b/g, 'petit roque');
  // Notation figurine : la pièce reprend sa LETTRE algébrique (« ♖xf5 » → « Rxf5 »)
  // pour que la passe suivante traite le coup en entier, prise et échec compris.
  // La remplacer directement par son nom ne suffisait pas : le « f6 » restant
  // ressemblait alors à une case citée seule, et n'était plus traduit du tout.
  out = out.replace(/([♔♚♕♛♖♜♗♝♘♞])\s*(?=[a-h1-8x])/g, (_, fig: string) => FIGURINE_SAN[fig]);
  // Le pion n'a pas de lettre : on le dit en clair.
  out = out.replace(
    /[♙♟]\s*(x?)([a-h][1-8])/g,
    (_, x: string, sq: string) => `pion ${x ? 'prend en' : 'en'} ${sq}`
  );

  out = out.replace(SAN_RE, (whole, piece, fromFile, fromRank, capture, to, promo, suffix) => {
    // Rien qui identifie un coup : on ne touche pas au texte (« la case e4 »).
    if (!piece && !capture && !promo && !suffix && !fromFile && !fromRank) return whole;
    const parts: string[] = [];
    if (piece) {
      parts.push(PIECE_WORD[piece as string]);
      // Colonne/rangée de départ : une levée d'ambiguïté (« Cbd2 »).
      if (fromFile || fromRank) parts.push(`de ${(fromFile ?? '') + (fromRank ?? '')}`);
    } else if (fromFile) {
      // Prise de pion : « exd5 » se dit « le pion e prend en d5 », pas « de e ».
      parts.push(`le pion ${fromFile}`);
    }
    parts.push(capture ? `prend en ${to}` : `en ${to}`);
    if (promo) parts.push(`et devient ${PIECE_WORD[promo as string]}`);
    if (suffix === '+') parts.push('échec');
    if (suffix === '#') parts.push('échec et mat');
    return parts.join(' ');
  });

  // Une prise orpheline (« xf5 », la pièce ayant déjà été nommée).
  out = out.replace(/\bx([a-h][1-8])\b/g, 'prend en $1');
  // Figurine isolée, sans coup derrière (une légende, un camp) : son nom suffit.
  out = out.replace(/[♔♕♖♗♘♙♚♛♜♝♞♟]/g, (fig) => FIGURINE_WORD[fig]);
  return out;
}

/**
 * Retire ce qui ne doit pas être prononcé. Sans ça la synthèse lit les emoji
 * à voix haute (« Parfait. Tu vois loin aujourd'hui. yeux »).
 */
// Notation rappelée entre parenthèses après une phrase qui dit déjà le coup
// en clair (« ta dame de d1 prend le fou en e6 (Qxe6) »). À l'écrit elle
// apprend la notation ; à l'oral elle répéterait le coup une seconde fois,
// en charabia.
const PARENTHESIZED_SAN = /\s*\((?:O-O-O|O-O|0-0-0|0-0|[♔♚♕♛♖♜♗♝♘♞]?[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[♕♛♖♜♗♝♘♞QRBN])?[+#]?)\)/g;

export function speakableText(text: string): string {
  // On retire sans rien mettre à la place : insérer une espace décalerait la
  // ponctuation française (« C'est parti ! » deviendrait « C'est parti! »).
  return spokenNotation(text.replace(PARENTHESIZED_SAN, ''))
    .replace(/\p{Extended_Pictographic}/gu, '') // emoji
    // Modificateurs : en alternance, pas en classe — un ZWJ ou un sélecteur de
    // variante dans un [...] est ambigu.
    .replace(/[\u{1F3FB}-\u{1F3FF}]|\u{FE0F}|\u{FE0E}|\u{200D}|\u{20E3}/gu, '')
    .replace(/[♔♕♖♗♘♙♚♛♜♝♞♟]/g, '') // figurine résiduelle
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function listFrenchVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return [];
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('fr'));
}

/**
 * Découpe en phrases. Une longue tirade lue d'un seul souffle est ce qui sonne
 * le plus « robot » : phrase par phrase, le moteur repose son intonation à
 * chaque fois et respire aux bons endroits.
 */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface SpeakOptions {
  /**
   * Réplique essentielle : avertissement avant une gaffe, conseil demandé,
   * fin de partie, consigne d'une leçon. Le reste (félicitations, petites
   * phrases d'ambiance) n'est lu que si tu as demandé « tout ».
   */
  important?: boolean;
  /** Ignore le réglage « quand Néo parle » (bouton ▶ Tester, bouton 🔊). */
  force?: boolean;
}

let startTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Faut-il lire ce message à voix haute ? Trop parler est la première cause
 * d'exaspération : par défaut Néo ne dit que ce qui compte (avertissement,
 * conseil demandé, fin de partie) et écrit tout le reste, comme avant.
 */
export function shouldSpeak(
  settings: { coachVoice: boolean; coachVoiceScope: VoiceScope },
  options: SpeakOptions = {}
): boolean {
  if (!settings.coachVoice) return false; // voix coupée : rien ne passe, jamais
  if (options.force || options.important) return true;
  return settings.coachVoiceScope === 'all';
}

export function speak(text: string, options: SpeakOptions = {}): void {
  if (!('speechSynthesis' in window)) return;
  const state = useSettings.getState();
  const { coachVoiceRate, coachVoicePitch, volume } = state;
  if (!shouldSpeak(state, options)) return;
  const spoken = speakableText(text);
  if (!spoken) return; // message purement emoji : rien à dire

  stopSpeaking();
  if (!cachedVoice) cachedVoice = pickFrenchVoice();

  const chunks = sentences(spoken);
  // Chrome (Android surtout) ignore silencieusement un `speak()` lancé dans la
  // foulée d'un `cancel()` : la première phrase se perd, ou tout reste muet.
  // Un court répit remet le moteur d'aplomb.
  startTimer = setTimeout(() => {
    startTimer = null;
    for (const chunk of chunks) {
      const utterance = new SpeechSynthesisUtterance(chunk);
      if (cachedVoice) utterance.voice = cachedVoice;
      utterance.lang = 'fr-FR';
      // Débit et hauteur réglables : les moteurs de synthèse français sont
      // très inégaux, et ce qui sonne juste sur un téléphone crie sur l'autre.
      // Aucune modulation aléatoire ici — elle sonnait « ivre » plus qu'humaine.
      utterance.rate = coachVoiceRate;
      utterance.pitch = coachVoicePitch;
      utterance.volume = volume;
      speechSynthesis.speak(utterance);
    }
  }, 90);
}

export function stopSpeaking(): void {
  if (startTimer) {
    clearTimeout(startTimer);
    startTimer = null;
  }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

/** Invalide le cache (après changement de voix dans les réglages) */
export function resetVoiceCache(): void {
  cachedVoice = null;
}

// Les voix arrivent parfois de façon asynchrone
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
  };
}
