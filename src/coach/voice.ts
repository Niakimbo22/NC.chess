import { useSettings } from '../store/settings';

/**
 * Synthèse vocale du coach. Sélectionne automatiquement la meilleure voix
 * française disponible sur le système : les voix « naturelles / premium »
 * des OS récents sont préférées aux voix robotiques de base.
 */

let cachedVoice: SpeechSynthesisVoice | null = null;

const PREFERRED_PATTERNS = [
  /natural/i, // voix neurales Edge/Windows
  /premium|enhanced|améliorée/i, // voix iOS/macOS haute qualité
  /siri/i,
  /google/i, // mieux que les voix eSpeak de base
];

export function pickFrenchVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;
  const preferredName = useSettings.getState().coachVoiceName;
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('fr'));
  if (voices.length === 0) return null;
  if (preferredName) {
    const chosen = voices.find((v) => v.name === preferredName);
    if (chosen) return chosen;
  }
  for (const pattern of PREFERRED_PATTERNS) {
    const match = voices.find((v) => pattern.test(v.name));
    if (match) return match;
  }
  // Sinon : une voix locale par défaut, ou la première
  return voices.find((v) => v.default) ?? voices[0];
}

export function listFrenchVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return [];
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('fr'));
}

export function speak(text: string): void {
  if (!('speechSynthesis' in window)) return;
  const { coachVoice, volume } = useSettings.getState();
  if (!coachVoice) return;
  speechSynthesis.cancel();
  if (!cachedVoice) cachedVoice = pickFrenchVoice();
  const utterance = new SpeechSynthesisUtterance(text);
  if (cachedVoice) utterance.voice = cachedVoice;
  utterance.lang = 'fr-FR';
  utterance.rate = 1.02;
  utterance.pitch = 1;
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
if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
  };
}
