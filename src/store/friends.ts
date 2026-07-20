import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Alphabet sans caractères ambigus (identique à celui des salons P2P). */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Génère un code ami stable, formaté XXXX-XXXX (8 caractères). */
function generateFriendCode(): string {
  let raw = '';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (const b of bytes) raw += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

/** Ne garde que les caractères valides et remet le tiret : "af3p b2k9" → "AF3P-B2K9". */
export function normalizeFriendCode(input: string): string {
  const clean = input.trim().toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '');
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
}

/** Extrait un code ami d'un lien d'invitation (?friend=XXXX-XXXX) ou d'un code brut. */
export function extractFriendCode(input: string): string {
  const match = input.match(/friend=([A-Za-z0-9-]+)/);
  return normalizeFriendCode(match ? match[1] : input);
}

/**
 * Statut de la relation :
 * - 'pending'   : ajouté d'un seul côté (code collé, lien ouvert, pseudo saisi
 *                 à la main) — rien ne prouve encore que l'autre personne t'a
 *                 ajouté aussi. En attente de confirmation.
 * - 'confirmed' : confirmé en direct via le canal P2P (demande d'ami acceptée
 *                 pendant une partie/un salon), donc mutuel et vérifié.
 */
export type FriendStatus = 'pending' | 'confirmed';

export interface Friend {
  id: string;
  pseudo: string;
  avatar: string;
  /** Code ami (permet de créer un salon commun déterministe). Vide si ajouté au pseudo seul. */
  code: string;
  status: FriendStatus;
  addedAt: number;
}

interface FriendsState {
  myCode: string;
  friends: Friend[];
  /** Ajoute un ami (par défaut en attente). Retourne l'id créé, ou null si un ami avec le même code existe déjà. */
  addFriend: (f: { pseudo: string; avatar?: string; code?: string; status?: FriendStatus }) => string | null;
  removeFriend: (id: string) => void;
  updateFriend: (id: string, patch: Partial<Pick<Friend, 'pseudo' | 'avatar' | 'code'>>) => void;
  /** Marque un ami comme confirmé (validation manuelle ou automatique). */
  confirmFriend: (id: string) => void;
  /** Confirme (ou crée directement confirmé) l'ami associé à ce code — utilisé après une poignée de main P2P en direct. */
  confirmFriendByCode: (code: string, info: { pseudo: string; avatar?: string }) => void;
}

export const useFriends = create<FriendsState>()(
  persist(
    (set, get) => ({
      myCode: generateFriendCode(),
      friends: [],
      addFriend: ({ pseudo, avatar, code, status }) => {
        const normalized = code ? normalizeFriendCode(code) : '';
        const state = get();
        if (normalized && normalized === state.myCode) return null; // pas soi-même
        const existing = normalized ? state.friends.find((f) => f.code === normalized) : undefined;
        if (existing) {
          // Déjà dans la liste : une confirmation en direct fait passer 'pending' → 'confirmed'.
          if (status === 'confirmed' && existing.status !== 'confirmed') get().confirmFriend(existing.id);
          return null;
        }
        const friend: Friend = {
          id: Math.random().toString(36).slice(2, 10),
          pseudo: pseudo.trim() || 'Ami',
          avatar: avatar || '🙂',
          code: normalized,
          status: status ?? 'pending',
          addedAt: Date.now(),
        };
        set({ friends: [friend, ...state.friends] });
        return friend.id;
      },
      removeFriend: (id) => set({ friends: get().friends.filter((f) => f.id !== id) }),
      updateFriend: (id, patch) =>
        set({
          friends: get().friends.map((f) =>
            f.id === id ? { ...f, ...patch, code: patch.code != null ? normalizeFriendCode(patch.code) : f.code } : f
          ),
        }),
      confirmFriend: (id) =>
        set({
          friends: get().friends.map((f) => (f.id === id ? { ...f, status: 'confirmed' } : f)),
        }),
      confirmFriendByCode: (code, info) => {
        const normalized = normalizeFriendCode(code);
        const state = get();
        const existing = state.friends.find((f) => f.code === normalized);
        if (existing) {
          if (existing.status !== 'confirmed') get().confirmFriend(existing.id);
          return;
        }
        get().addFriend({ pseudo: info.pseudo, avatar: info.avatar, code: normalized, status: 'confirmed' });
      },
    }),
    { name: 'ncchess-friends' }
  )
);

/**
 * Dérive un code de salon commun et déterministe à partir de deux codes amis.
 * Les deux amis obtiennent le même salon quel que soit l'ordre → l'un héberge,
 * l'autre rejoint, sans avoir à s'échanger un code à chaque partie.
 */
export function pairRoomCode(codeA: string, codeB: string): string {
  const a = normalizeFriendCode(codeA).replace('-', '');
  const b = normalizeFriendCode(codeB).replace('-', '');
  const [lo, hi] = [a, b].sort();
  // Hash déterministe simple (FNV-1a) → 6 caractères de l'alphabet des salons.
  let h = 0x811c9dc5;
  const seed = `${lo}|${hi}`;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[h % CODE_ALPHABET.length];
    h = Math.floor(h / CODE_ALPHABET.length) + 0x9e3779b1;
    h = h >>> 0;
  }
  return code;
}
