import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Color, type Move } from 'chess.js';
import type { BoardMove } from '../components/board/Chessboard';
import type { TimeControl } from './timeControls';
import { playMoveSound, playSound } from '../audio/sounds';

export type EndReason =
  | 'checkmate'
  | 'timeout'
  | 'resign'
  | 'stalemate'
  | 'insufficient'
  | 'threefold'
  | 'fifty'
  | 'agreement'
  | 'abandon';

export interface GameResult {
  winner: Color | null;
  reason: EndReason;
}

export const END_REASON_FR: Record<EndReason, string> = {
  checkmate: 'échec et mat',
  timeout: 'au temps',
  resign: 'par abandon',
  stalemate: 'pat',
  insufficient: 'matériel insuffisant',
  threefold: 'triple répétition',
  fifty: 'règle des 50 coups',
  agreement: 'nulle par accord mutuel',
  abandon: 'partie abandonnée',
};

export interface UseChessGameOptions {
  timeControl: TimeControl;
  startFen?: string;
  /** Appelé après chaque coup joué (pour IA / P2P / analyse) */
  onMovePlayed?: (move: Move, fen: string) => void;
  onGameEnd?: (result: GameResult) => void;
  muted?: boolean;
}

export interface ChessGame {
  fen: string;
  /** FEN affiché (navigation dans l'historique) */
  viewFen: string;
  viewIndex: number;
  history: Move[];
  turn: Color;
  result: GameResult | null;
  lastMove: { from: Move['from']; to: Move['to'] } | null;
  clock: { w: number; b: number } | null;
  clockRunning: boolean;
  makeMove: (move: BoardMove) => Move | null;
  applySanOrUci: (san: string) => Move | null;
  resign: (color: Color) => void;
  endGame: (result: GameResult) => void;
  agreeDraw: () => void;
  undo: (count?: number) => void;
  goTo: (index: number) => void;
  reset: (fen?: string) => void;
  startClock: () => void;
  syncClock: (w: number, b: number) => void;
  chessRef: React.RefObject<Chess>;
}

export function useChessGame(options: UseChessGameOptions): ChessGame {
  const { timeControl, startFen, onMovePlayed, onGameEnd, muted } = options;
  const chessRef = useRef<Chess>(new Chess(startFen));
  const [fen, setFen] = useState(chessRef.current.fen());
  const [history, setHistory] = useState<Move[]>([]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [viewIndex, setViewIndex] = useState(-1); // -1 = position courante, -2 = position initiale
  const [clock, setClock] = useState<{ w: number; b: number } | null>(
    timeControl.initial != null ? { w: timeControl.initial * 1000, b: timeControl.initial * 1000 } : null
  );
  const [clockRunning, setClockRunning] = useState(false);
  const lowTimePlayed = useRef<{ w: boolean; b: boolean }>({ w: false, b: false });
  const resultRef = useRef<GameResult | null>(null);

  const endGame = useCallback(
    (r: GameResult) => {
      if (resultRef.current) return;
      resultRef.current = r;
      setResult(r);
      setClockRunning(false);
      onGameEnd?.(r);
    },
    [onGameEnd]
  );

  // Pendule
  useEffect(() => {
    if (!clockRunning || clock == null || resultRef.current) return;
    const interval = setInterval(() => {
      setClock((c) => {
        if (!c) return c;
        const turn = chessRef.current.turn();
        const next = { ...c, [turn]: c[turn] - 100 };
        if (next[turn] <= 10000 && !lowTimePlayed.current[turn]) {
          lowTimePlayed.current[turn] = true;
          if (!muted) playSound('LowTime');
        }
        if (next[turn] <= 0) {
          next[turn] = 0;
          // mat impossible pour l'adversaire → nulle, sinon victoire au temps
          const opponent: Color = turn === 'w' ? 'b' : 'w';
          endGame({ winner: opponent, reason: 'timeout' });
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [clockRunning, clock != null, endGame, muted]);

  const checkGameEnd = useCallback(
    (chess: Chess) => {
      if (chess.isCheckmate()) {
        endGame({ winner: chess.turn() === 'w' ? 'b' : 'w', reason: 'checkmate' });
      } else if (chess.isStalemate()) {
        endGame({ winner: null, reason: 'stalemate' });
      } else if (chess.isInsufficientMaterial()) {
        endGame({ winner: null, reason: 'insufficient' });
      } else if (chess.isThreefoldRepetition()) {
        endGame({ winner: null, reason: 'threefold' });
      } else if (chess.isDrawByFiftyMoves()) {
        endGame({ winner: null, reason: 'fifty' });
      }
    },
    [endGame]
  );

  const afterMove = useCallback(
    (move: Move) => {
      const chess = chessRef.current;
      setFen(chess.fen());
      setHistory([...chess.history({ verbose: true })]);
      // On NE ramène PAS au direct : si tu es en train de revoir le coup de
      // l'adversaire, un coup joué pendant ce temps ne doit pas te téléporter.
      // La barre de relecture et le bandeau disent où tu es, « ⏭ » ramène.
      if (!muted) playMoveSound(move.flags, chess.inCheck(), chess.isCheckmate());
      // Incrément + démarrage pendule après le premier coup des noirs
      setClock((c) => {
        if (!c || timeControl.initial == null) return c;
        return { ...c, [move.color]: c[move.color] + timeControl.increment * 1000 };
      });
      if (chess.history().length >= 2) setClockRunning(true);
      checkGameEnd(chess);
      onMovePlayed?.(move, chess.fen());
    },
    [muted, timeControl, checkGameEnd, onMovePlayed]
  );

  const makeMove = useCallback(
    (bm: BoardMove): Move | null => {
      if (resultRef.current) return null;
      const chess = chessRef.current;
      try {
        const move = chess.move({ from: bm.from, to: bm.to, promotion: bm.promotion });
        afterMove(move);
        return move;
      } catch {
        return null;
      }
    },
    [afterMove]
  );

  const applySanOrUci = useCallback(
    (notation: string): Move | null => {
      if (resultRef.current) return null;
      const chess = chessRef.current;
      try {
        const move = chess.move(notation);
        afterMove(move);
        return move;
      } catch {
        try {
          const move = chess.move({
            from: notation.slice(0, 2),
            to: notation.slice(2, 4),
            promotion: notation.length > 4 ? (notation[4] as Move['promotion']) : undefined,
          });
          afterMove(move);
          return move;
        } catch {
          return null;
        }
      }
    },
    [afterMove]
  );

  const resign = useCallback(
    (color: Color) => {
      endGame({ winner: color === 'w' ? 'b' : 'w', reason: 'resign' });
    },
    [endGame]
  );

  const agreeDraw = useCallback(() => {
    endGame({ winner: null, reason: 'agreement' });
  }, [endGame]);

  const undo = useCallback((count = 1) => {
    const chess = chessRef.current;
    for (let i = 0; i < count; i++) chess.undo();
    resultRef.current = null;
    setResult(null);
    setFen(chess.fen());
    setHistory([...chess.history({ verbose: true })]);
    setViewIndex(-1);
  }, []);

  const goTo = useCallback((index: number) => {
    // Le dernier demi-coup EST la position courante : on le ramène à -1 (« live »).
    // Sans ça, revenir en avant jusqu'au bout laissait la partie en mode revue sur
    // une position identique à la position réelle : l'échiquier restait verrouillé,
    // « Fin » était désactivé (on est déjà au bout) — plus aucun moyen de reprendre
    // la main, alors que la pendule continuait de tourner.
    const live = chessRef.current.history().length;
    setViewIndex(index >= 0 && index >= live - 1 ? -1 : index);
  }, []);

  const reset = useCallback(
    (newFen?: string) => {
      chessRef.current = new Chess(newFen ?? startFen);
      resultRef.current = null;
      setResult(null);
      setFen(chessRef.current.fen());
      setHistory([]);
      setViewIndex(-1);
      lowTimePlayed.current = { w: false, b: false };
      setClock(timeControl.initial != null ? { w: timeControl.initial * 1000, b: timeControl.initial * 1000 } : null);
      setClockRunning(false);
    },
    [startFen, timeControl]
  );

  const startClock = useCallback(() => setClockRunning(true), []);

  const syncClock = useCallback((w: number, b: number) => {
    setClock((c) => (c ? { w, b } : c));
  }, []);

  const viewFen = useMemo(() => {
    if (viewIndex === -2) return new Chess(startFen).fen();
    if (viewIndex < 0 || viewIndex >= history.length) return fen;
    const replay = new Chess(startFen);
    for (let i = 0; i <= viewIndex; i++) {
      replay.move(history[i].san);
    }
    return replay.fen();
  }, [viewIndex, history, fen, startFen]);

  const lastMove = useMemo(() => {
    if (viewIndex === -2) return null;
    const idx = viewIndex < 0 ? history.length - 1 : viewIndex;
    if (idx < 0 || idx >= history.length) return null;
    return { from: history[idx].from, to: history[idx].to };
  }, [history, viewIndex]);

  return {
    fen,
    viewFen,
    viewIndex,
    history,
    turn: chessRef.current.turn(),
    result,
    lastMove,
    clock,
    clockRunning,
    makeMove,
    applySanOrUci,
    resign,
    endGame,
    agreeDraw,
    undo,
    goTo,
    reset,
    startClock,
    syncClock,
    chessRef,
  };
}
