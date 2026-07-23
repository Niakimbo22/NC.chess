export interface SavedGame {
  id: string;
  date: number;
  mode: 'local' | 'bot' | 'p2p' | 'neo';
  white: string;
  black: string;
  pgn: string;
  timeControl: string;
  /** Résultat du point de vue : '1-0' | '0-1' | '1/2-1/2' | '*' */
  result?: string;
  /** Elo du joueur après la partie (mode bot) */
  playerEloAfter?: number;
  botId?: string;
}

const KEY = 'ncchess-games';
const MAX_GAMES = 500;

export function loadGameHistory(): SavedGame[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as SavedGame[];
  } catch {
    return [];
  }
}

export function saveGameToHistory(game: Omit<SavedGame, 'id' | 'date'>): SavedGame {
  const saved: SavedGame = {
    ...game,
    id: Math.random().toString(36).slice(2, 10),
    date: Date.now(),
  };
  const all = loadGameHistory();
  all.unshift(saved);
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, MAX_GAMES)));
  return saved;
}

export function deleteGameFromHistory(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(loadGameHistory().filter((g) => g.id !== id)));
}
