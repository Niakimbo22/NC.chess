import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  coachVoice: true,
  coachVoiceName: null,
};

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (partial) => set(partial),
      reset: () => set(DEFAULTS),
    }),
    { name: 'ncchess-settings' }
  )
);
