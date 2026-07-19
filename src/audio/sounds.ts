import { useSettings } from '../store/settings';

export type SoundName =
  | 'Move'
  | 'Capture'
  | 'Check'
  | 'Checkmate'
  | 'LowTime'
  | 'GenericNotify'
  | 'Victory'
  | 'Defeat'
  | 'Draw'
  | 'NewChallenge'
  | 'Confirmation'
  | 'Error'
  | 'Select';

const cache = new Map<string, HTMLAudioElement>();

function getAudio(pack: string, name: SoundName): HTMLAudioElement {
  const key = `${pack}/${name}`;
  let audio = cache.get(key);
  if (!audio) {
    audio = new Audio(`${import.meta.env.BASE_URL}sounds/${pack}/${name}.mp3`);
    audio.preload = 'auto';
    cache.set(key, audio);
  }
  return audio;
}

export function playSound(name: SoundName): void {
  const { soundEnabled, soundPack, volume } = useSettings.getState();
  if (!soundEnabled || volume <= 0) return;
  try {
    const audio = getAudio(soundPack, name);
    audio.volume = volume;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Le pack n'a pas ce son (ex: Select) → repli sur le pack standard
      if (soundPack !== 'standard') {
        const fallback = getAudio('standard', name);
        fallback.volume = volume;
        fallback.currentTime = 0;
        void fallback.play().catch(() => {});
      }
    });
  } catch {
    // Autoplay bloqué avant la première interaction : silencieux
  }
}

/** Joue le son adapté à un coup (drapeaux chess.js : c=capture, e=en passant, k/q=roque, p=promotion) */
export function playMoveSound(flags: string, inCheck: boolean, isMate: boolean): void {
  if (isMate) return playSound('Checkmate');
  if (inCheck) return playSound('Check');
  if (flags.includes('c') || flags.includes('e')) return playSound('Capture');
  return playSound('Move');
}
