import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Quand Néo parle à voix haute. */
export type VoiceScope = 'key' | 'all';

export interface Settings {
  boardTheme: string;
  pieceSet: string;
  soundPack: string;
  soundEnabled: boolean;
  volume: number; // 0..1
  showCoordinates: boolean;
  showLegalMoves: boolean;
  highlightLastMove: boolean;
  premoveEnabled: boolean;
  autoQueen: boolean;
  animationMs: number; // 0 = désactivé
  confirmMove: boolean;
  showEvalBar: boolean;
  coachVoice: boolean;
  coachVoiceName: string | null;
  /** 'key' = seulement l'essentiel (défaut), 'all' = tout ce que Néo écrit */
  coachVoiceScope: VoiceScope;
  coachVoiceRate: number; // 0.7..1.3
  coachVoicePitch: number; // 0.7..1.3
}

interface SettingsStore extends Settings {
  set: (partial: Partial<Settings>) => void;
  reset: () => void;
}

const DEFAULTS: Settings = {
  boardTheme: 'green',
  pieceSet: 'cburnett',
  soundPack: 'standard',
  soundEnabled: true,
  volume: 0.8,
  showCoordinates: true,
  showLegalMoves: true,
  highlightLastMove: true,
  premoveEnabled: true,
  autoQueen: false,
  animationMs: 180,
  confirmMove: false,
  showEvalBar: true,
  // La voix vient du moteur de synthèse du téléphone : on ne maîtrise pas son
  // timbre, et une voix robotique imposée d'office gâche tout. Elle est donc
  // silencieuse par défaut et s'active en connaissance de cause (Réglages ou
  // bouton 🔇 en partie), après avoir pu l'écouter.
  coachVoice: false,
  coachVoiceName: null,
  coachVoiceScope: 'key',
  coachVoiceRate: 0.95,
  coachVoicePitch: 1,
};

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (partial) => set(partial),
      reset: () => set(DEFAULTS),
    }),
    {
      name: 'ncchess-settings',
      version: 2,
      // v1 → v2 : la voix était activée d'office. On la coupe une bonne fois
      // pour toutes chez ceux qui l'avaient subie sans l'avoir choisie ; ceux
      // qui la veulent la rallument en un tapotement.
      migrate: (persisted, version) => {
        const state = { ...(persisted as Partial<Settings>) };
        if (version < 2) {
          state.coachVoice = false;
          state.coachVoiceScope = 'key';
          state.coachVoiceRate = DEFAULTS.coachVoiceRate;
          state.coachVoicePitch = DEFAULTS.coachVoicePitch;
        }
        return state as SettingsStore;
      },
    }
  )
);
