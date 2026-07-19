export interface BoardTheme {
  id: string;
  name: string;
  light: string;
  dark: string;
  /** Couleur du surlignage du dernier coup (posée en overlay semi-transparent) */
  lastMove: string;
  /** Couleur de sélection de case */
  selected: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  { id: 'green', name: 'Vert classique', light: '#ebecd0', dark: '#739552', lastMove: 'rgba(255, 255, 51, 0.5)', selected: 'rgba(255, 255, 51, 0.5)' },
  { id: 'brown', name: 'Bois', light: '#f0d9b5', dark: '#b58863', lastMove: 'rgba(155, 199, 0, 0.41)', selected: 'rgba(20, 85, 30, 0.5)' },
  { id: 'blue', name: 'Océan', light: '#dee3e6', dark: '#8ca2ad', lastMove: 'rgba(0, 155, 199, 0.41)', selected: 'rgba(0, 60, 120, 0.4)' },
  { id: 'purple', name: 'Améthyste', light: '#e8e0ec', dark: '#9f7cb5', lastMove: 'rgba(180, 130, 255, 0.5)', selected: 'rgba(120, 60, 180, 0.45)' },
  { id: 'marble', name: 'Marbre', light: '#e6e2dd', dark: '#948e88', lastMove: 'rgba(212, 180, 60, 0.5)', selected: 'rgba(120, 110, 90, 0.5)' },
  { id: 'ice', name: 'Glace', light: '#e8f1f5', dark: '#7eabc4', lastMove: 'rgba(80, 190, 255, 0.45)', selected: 'rgba(40, 120, 190, 0.45)' },
  { id: 'neon', name: 'Néon', light: '#2d2d3a', dark: '#1a1a24', lastMove: 'rgba(0, 255, 170, 0.35)', selected: 'rgba(0, 255, 170, 0.45)' },
  { id: 'rose', name: 'Rosé', light: '#f5e6e8', dark: '#c98b95', lastMove: 'rgba(255, 120, 150, 0.45)', selected: 'rgba(200, 60, 100, 0.4)' },
  { id: 'coffee', name: 'Café', light: '#d9c7b0', dark: '#7a5c43', lastMove: 'rgba(230, 180, 80, 0.5)', selected: 'rgba(120, 80, 40, 0.55)' },
  { id: 'forest', name: 'Forêt', light: '#d8e2c8', dark: '#4a6741', lastMove: 'rgba(190, 230, 100, 0.5)', selected: 'rgba(60, 110, 40, 0.55)' },
];

export function getBoardTheme(id: string): BoardTheme {
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];
}

export interface PieceSet {
  id: string;
  name: string;
}

export const PIECE_SETS: PieceSet[] = [
  { id: 'cburnett', name: 'Classique' },
  { id: 'merida', name: 'Mérida' },
  { id: 'alpha', name: 'Alpha' },
  { id: 'fresca', name: 'Fresca' },
  { id: 'pixel', name: 'Pixel' },
];

export function pieceUrl(set: string, color: 'w' | 'b', type: string): string {
  return `${import.meta.env.BASE_URL}pieces/${set}/${color}${type.toUpperCase()}.svg`;
}

export interface SoundPack {
  id: string;
  name: string;
}

export const SOUND_PACKS: SoundPack[] = [
  { id: 'standard', name: 'Classique' },
  { id: 'piano', name: 'Piano' },
  { id: 'futuristic', name: 'Futuriste' },
  { id: 'nes', name: 'Rétro (8-bit)' },
];
