import Peer, { type DataConnection } from 'peerjs';
import type { Color } from 'chess.js';

/** Alphabet sans caractères ambigus (pas de I/O/0/1) */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PEER_PREFIX = 'ncchess-room-';

export function generateRoomCode(): string {
  let code = '';
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return code;
}

export function normalizeRoomCode(input: string): string {
  // Ne garde que les caractères de l'alphabet de génération (pas de I/O/0/1)
  return input.trim().toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '');
}

export interface PlayerInfo {
  name: string;
  avatar: string;
  elo: number;
}

/**
 * Broker de signalisation : par défaut le cloud public PeerJS.
 * Avancé : un serveur auto-hébergé peut être défini via
 * localStorage['ncchess-peer-server'] = {"host":"...","port":9000,"path":"/","secure":false}
 */
function peerOptions(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem('ncchess-peer-server');
    if (raw) return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // config invalide → cloud par défaut
  }
  return {};
}

export type P2PMessage =
  | { type: 'hello'; player: PlayerInfo }
  | { type: 'start'; guestColor: Color; tcInitial: number | null; tcIncrement: number; host: PlayerInfo }
  | { type: 'move'; uci: string; clockW: number | null; clockB: number | null }
  | { type: 'chat'; text: string }
  | { type: 'drawOffer' }
  | { type: 'drawAccept' }
  | { type: 'drawDecline' }
  | { type: 'resign' }
  | { type: 'end'; winner: Color | null; reason: string }
  | { type: 'rematchOffer' }
  | { type: 'rematchAccept' }
  | { type: 'stateRequest' }
  | { type: 'state'; moves: string[]; clockW: number | null; clockB: number | null };

export interface SessionEvents {
  onOpen?: () => void;
  onConnected?: () => void;
  onMessage?: (msg: P2PMessage) => void;
  onDisconnected?: () => void;
  onError?: (message: string) => void;
}

/**
 * Session P2P : l'hôte crée un Peer dont l'ID est dérivé du code de salon,
 * l'invité s'y connecte directement. Aucun serveur applicatif : uniquement
 * le broker public PeerJS pour l'établissement de la connexion WebRTC.
 */
export class P2PSession {
  readonly role: 'host' | 'guest';
  readonly code: string;
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  /** Les handlers sont remplaçables (le lobby passe la main à l'écran de partie) */
  events: SessionEvents;
  private closed = false;

  constructor(role: 'host' | 'guest', code: string, events: SessionEvents) {
    this.role = role;
    this.code = code;
    this.events = events;
    if (role === 'host') this.startHost();
    else this.startGuest();
  }

  private startHost(): void {
    this.peer = new Peer(PEER_PREFIX + this.code, peerOptions());
    this.peer.on('open', () => this.events.onOpen?.());
    this.peer.on('error', (err) => {
      if ((err as { type?: string }).type === 'unavailable-id') {
        this.events.onError?.('Ce code de salon est déjà utilisé. Crée un nouveau salon.');
      } else {
        this.events.onError?.(`Erreur réseau : ${(err as Error).message}`);
      }
    });
    this.peer.on('connection', (conn) => {
      // Un seul adversaire à la fois ; remplace la connexion (cas de reconnexion)
      if (this.conn && this.conn.open) {
        conn.close();
        return;
      }
      this.attachConnection(conn);
    });
  }

  private startGuest(): void {
    this.peer = new Peer(peerOptions());
    this.peer.on('open', () => {
      this.events.onOpen?.();
      this.connectToHost();
    });
    this.peer.on('error', (err) => {
      if ((err as { type?: string }).type === 'peer-unavailable') {
        this.events.onError?.('Salon introuvable. Vérifie le code.');
      } else {
        this.events.onError?.(`Erreur réseau : ${(err as Error).message}`);
      }
    });
  }

  private connectToHost(): void {
    if (!this.peer || this.closed) return;
    const conn = this.peer.connect(PEER_PREFIX + this.code, { reliable: true });
    this.attachConnection(conn);
  }

  private attachConnection(conn: DataConnection): void {
    this.conn = conn;
    conn.on('open', () => this.events.onConnected?.());
    conn.on('data', (data) => {
      if (typeof data === 'object' && data !== null && 'type' in (data as object)) {
        this.events.onMessage?.(data as P2PMessage);
      }
    });
    conn.on('close', () => {
      if (!this.closed) this.events.onDisconnected?.();
    });
    conn.on('error', () => {
      if (!this.closed) this.events.onDisconnected?.();
    });
  }

  /** Tentative de reconnexion (invité uniquement) */
  reconnect(): void {
    if (this.role === 'guest' && !this.closed) {
      this.connectToHost();
    }
  }

  send(msg: P2PMessage): void {
    if (this.conn?.open) this.conn.send(msg);
  }

  get connected(): boolean {
    return !!this.conn?.open;
  }

  close(): void {
    this.closed = true;
    this.conn?.close();
    this.peer?.destroy();
  }
}
