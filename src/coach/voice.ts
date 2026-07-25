import { useSettings } from '../store/settings';

/**
 * Synthèse vocale du coach. Sélectionne automatiquement la meilleure voix
 * française disponible sur le système : les voix « naturelles / premium »
 * des OS récents sont préférées aux voix robotiques de base.
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
  // Un choix explicite dans les réglages primes toujours.
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
 * Retire ce qui ne doit pas être prononcé. Sans ça la synthèse lit les emoji
 * à voix haute (« Parfait. Tu vois loin aujourd'hui. yeux »).
 */
export function speakableText(text: string): string {
  // On retire sans rien mettre à la place : insérer une espace décalerait la
  // ponctuation française (« C'est parti ! » deviendrait « C'est parti! »).
  return text
    .replace(/\p{Extended_Pictographic}/gu, '') // emoji
    // Modificateurs : en alternance, pas en classe — un ZWJ ou un sélecteur de
    // variante dans un [...] est ambigu.
    .replace(/[\u{1F3FB}-\u{1F3FF}]|\u{FE0F}|\u{FE0E}|\u{200D}|\u{20E3}/gu, '')
    .replace(/[♔♕♖♗♘♙♚♛♜♝♞♟]/g, '') // pièces en figurine
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function listFrenchVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return [];
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('fr'));
}

export function speak(text: string): void {
  if (!('speechSynthesis' in window)) return;
  const { coachVoice, volume } = useSettings.getState();
  if (!coachVoice) return;
  const spoken = speakableText(text);
  if (!spoken) return; // message purement emoji : rien à dire
  speechSynthesis.cancel();
  if (!cachedVoice) cachedVoice = pickFrenchVoice();
  const utterance = new SpeechSynthesisUtterance(spoken);
  if (cachedVoice) utterance.voice = cachedVoice;
  utterance.lang = 'fr-FR';
  // Un peu plus lent et légèrement plus grave : moins « lecture de robot ».
  utterance.rate = 0.96;
  utterance.pitch = 0.95;
  utterance.volume = volume;
  speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
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
