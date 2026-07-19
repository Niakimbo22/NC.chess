import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Chess, type Square, type PieceSymbol, type Color } from 'chess.js';
import { getBoardTheme, pieceUrl } from '../../themes/boardThemes';
import { useSettings } from '../../store/settings';
import './board.css';

export interface Arrow {
  from: Square;
  to: Square;
  color?: string;
}

export interface BoardMove {
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
}

interface Props {
  fen: string;
  orientation: Color;
  /** Couleur que l'utilisateur a le droit de jouer ('w' | 'b'), 'both' en pass-and-play, null = spectateur */
  playableColor: Color | 'both' | null;
  onMove: (move: BoardMove) => void;
  lastMove?: { from: Square; to: Square } | null;
  /** Flèches externes (analyse, indice…) */
  arrows?: Arrow[];
  /** Cases à marquer en externe (leçons, puzzles) */
  markedSquares?: Square[];
  interactive?: boolean;
}

interface PieceOnBoard {
  square: Square;
  type: PieceSymbol;
  color: Color;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

function squareToXY(square: Square, orientation: Color): { x: number; y: number } {
  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1], 10) - 1;
  return orientation === 'w' ? { x: file, y: 7 - rank } : { x: 7 - file, y: rank };
}

function xyToSquare(x: number, y: number, orientation: Color): Square | null {
  if (x < 0 || x > 7 || y < 0 || y > 7) return null;
  const file = orientation === 'w' ? x : 7 - x;
  const rank = orientation === 'w' ? 7 - y : y;
  return (FILES[file] + (rank + 1)) as Square;
}

export default function Chessboard({
  fen,
  orientation,
  playableColor,
  onMove,
  lastMove,
  arrows = [],
  markedSquares = [],
  interactive = true,
}: Props) {
  const settings = useSettings();
  const theme = getBoardTheme(settings.boardTheme);
  const boardRef = useRef<HTMLDivElement>(null);

  const chess = useMemo(() => new Chess(fen), [fen]);
  const turn = chess.turn();

  const pieces: PieceOnBoard[] = useMemo(() => {
    const list: PieceOnBoard[] = [];
    for (const row of chess.board()) {
      for (const cell of row) {
        if (cell) list.push({ square: cell.square, type: cell.type, color: cell.color });
      }
    }
    return list;
  }, [chess]);

  const [selected, setSelected] = useState<Square | null>(null);
  const [dragging, setDragging] = useState<{ square: Square; x: number; y: number } | null>(null);
  const [premove, setPremove] = useState<BoardMove | null>(null);
  const [promotionPending, setPromotionPending] = useState<{ from: Square; to: Square } | null>(null);
  const [userShapes, setUserShapes] = useState<{ arrows: Arrow[]; squares: Square[] }>({ arrows: [], squares: [] });
  const rightDrag = useRef<Square | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<BoardMove | null>(null);

  const canPlay = useCallback(
    (color: Color) => interactive && (playableColor === 'both' || playableColor === color),
    [interactive, playableColor]
  );

  const isMyTurn = playableColor === 'both' || playableColor === turn;

  const legalTargets = useMemo(() => {
    if (!selected) return new Set<Square>();
    if (!isMyTurn) return new Set<Square>();
    return new Set(chess.moves({ square: selected, verbose: true }).map((m) => m.to));
  }, [selected, chess, isMyTurn]);

  // Exécute le pré-coup dès que c'est notre tour
  useEffect(() => {
    if (!premove || playableColor === 'both' || playableColor === null) return;
    if (turn === playableColor) {
      const move = premove;
      setPremove(null);
      const legal = chess
        .moves({ square: move.from, verbose: true })
        .some((m) => m.to === move.to);
      if (legal) onMove(move);
    }
  }, [turn, premove, playableColor, chess, onMove]);

  // Nettoie la sélection quand la position change
  useEffect(() => {
    setSelected(null);
    setPromotionPending(null);
    setPendingConfirm(null);
    setUserShapes({ arrows: [], squares: [] });
  }, [fen]);

  const needsPromotion = useCallback(
    (from: Square, to: Square): boolean => {
      const piece = chess.get(from);
      if (!piece || piece.type !== 'p') return false;
      return (piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1');
    },
    [chess]
  );

  const submitMove = useCallback(
    (move: BoardMove) => {
      if (settings.confirmMove) {
        setPendingConfirm(move);
      } else {
        onMove(move);
      }
    },
    [settings.confirmMove, onMove]
  );

  const tryMove = useCallback(
    (from: Square, to: Square) => {
      if (from === to) return;
      const piece = chess.get(from);
      if (!piece || !canPlay(piece.color)) return;

      // Pas notre tour → pré-coup
      if (piece.color !== turn) {
        if (settings.premoveEnabled && playableColor !== 'both') {
          setPremove({ from, to });
          setSelected(null);
        }
        return;
      }

      const legal = chess.moves({ square: from, verbose: true }).some((m) => m.to === to);
      if (!legal) {
        setSelected(null);
        return;
      }

      if (needsPromotion(from, to)) {
        if (settings.autoQueen) {
          submitMove({ from, to, promotion: 'q' });
        } else {
          setPromotionPending({ from, to });
        }
      } else {
        submitMove({ from, to });
      }
      setSelected(null);
    },
    [chess, turn, canPlay, settings.premoveEnabled, settings.autoQueen, playableColor, needsPromotion, submitMove]
  );

  const squareFromEvent = useCallback(
    (clientX: number, clientY: number): Square | null => {
      const board = boardRef.current;
      if (!board) return null;
      const rect = board.getBoundingClientRect();
      const x = Math.floor(((clientX - rect.left) / rect.width) * 8);
      const y = Math.floor(((clientY - rect.top) / rect.height) * 8);
      return xyToSquare(x, y, orientation);
    },
    [orientation]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!interactive) return;
      const square = squareFromEvent(e.clientX, e.clientY);
      if (!square) return;

      if (e.button === 2) {
        rightDrag.current = square;
        return;
      }
      if (e.button !== 0) return;

      // Toute action gauche efface les formes utilisateur et le pré-coup
      setUserShapes({ arrows: [], squares: [] });
      if (premove) setPremove(null);

      const piece = chess.get(square);

      if (selected && legalTargets.has(square)) {
        tryMove(selected, square);
        return;
      }
      if (selected && premove === null && selected !== square && piece && canPlay(piece.color) && piece.color !== turn && playableColor !== 'both') {
        // reselection d'une autre de nos pièces pour un pré-coup géré plus bas
      }
      if (selected === square) {
        setSelected(null);
        return;
      }
      if (piece && canPlay(piece.color)) {
        setSelected(square);
        setDragging({ square, x: e.clientX, y: e.clientY });
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      } else if (selected) {
        // clic sur case vide non légale → tentative (pour pré-coup) puis désélection
        tryMove(selected, square);
        setSelected(null);
      }
    },
    [interactive, squareFromEvent, chess, selected, legalTargets, tryMove, canPlay, premove, turn, playableColor]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    setDragging((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : null));
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 2 && rightDrag.current) {
        const to = squareFromEvent(e.clientX, e.clientY);
        const from = rightDrag.current;
        rightDrag.current = null;
        if (to) {
          setUserShapes((s) => {
            if (from === to) {
              const has = s.squares.includes(to);
              return { ...s, squares: has ? s.squares.filter((q) => q !== to) : [...s.squares, to] };
            }
            const exists = s.arrows.some((a) => a.from === from && a.to === to);
            return {
              ...s,
              arrows: exists ? s.arrows.filter((a) => !(a.from === from && a.to === to)) : [...s.arrows, { from, to }],
            };
          });
        }
        return;
      }
      if (!dragging) return;
      const target = squareFromEvent(e.clientX, e.clientY);
      const from = dragging.square;
      setDragging(null);
      if (target && target !== from) {
        tryMove(from, target);
      }
    },
    [dragging, squareFromEvent, tryMove]
  );

  const inCheck = chess.inCheck();
  const kingSquare = useMemo(() => {
    if (!inCheck) return null;
    return pieces.find((p) => p.type === 'k' && p.color === turn)?.square ?? null;
  }, [inCheck, pieces, turn]);

  // ----- Rendu -----
  const squares = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const square = xyToSquare(x, y, orientation)!;
      const isLight = (x + y) % 2 === 0;
      const isLast = settings.highlightLastMove && lastMove && (lastMove.from === square || lastMove.to === square);
      const isSelected = selected === square;
      const isPremove = premove && (premove.from === square || premove.to === square);
      const isMarked = userShapes.squares.includes(square) || markedSquares.includes(square);
      const isCheck = kingSquare === square;
      squares.push(
        <div
          key={square}
          className="nc-square"
          style={{
            left: `${x * 12.5}%`,
            top: `${y * 12.5}%`,
            background: isLight ? theme.light : theme.dark,
          }}
        >
          {isLast && <div className="nc-overlay" style={{ background: theme.lastMove }} />}
          {isSelected && <div className="nc-overlay" style={{ background: theme.selected }} />}
          {isPremove && <div className="nc-overlay" style={{ background: 'rgba(30, 130, 230, 0.45)' }} />}
          {isMarked && <div className="nc-overlay" style={{ background: 'rgba(224, 40, 40, 0.55)' }} />}
          {isCheck && <div className="nc-overlay nc-check" />}
          {settings.showLegalMoves && legalTargets.has(square) && (
            <div className={chess.get(square) ? 'nc-capture-hint' : 'nc-move-hint'} />
          )}
          {settings.showCoordinates && x === 0 && (
            <span className="nc-coord nc-coord-rank" style={{ color: isLight ? theme.dark : theme.light }}>
              {square[1]}
            </span>
          )}
          {settings.showCoordinates && y === 7 && (
            <span className="nc-coord nc-coord-file" style={{ color: isLight ? theme.dark : theme.light }}>
              {square[0]}
            </span>
          )}
        </div>
      );
    }
  }

  const boardRect = boardRef.current?.getBoundingClientRect();

  return (
    <div
      ref={boardRef}
      className="nc-board"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {squares}
      {pieces.map((p) => {
        const { x, y } = squareToXY(p.square, orientation);
        const isDragged = dragging?.square === p.square;
        let style: React.CSSProperties = {
          transform: `translate(${x * 100}%, ${y * 100}%)`,
          transition: settings.animationMs > 0 ? `transform ${settings.animationMs}ms ease` : undefined,
        };
        if (isDragged && boardRect) {
          const px = ((dragging.x - boardRect.left) / boardRect.width) * 800 - 50;
          const py = ((dragging.y - boardRect.top) / boardRect.height) * 800 - 50;
          style = { transform: `translate(${px}%, ${py}%)`, zIndex: 20, transition: 'none', pointerEvents: 'none' };
        }
        return (
          <img
            key={`${p.square}`}
            className="nc-piece"
            src={pieceUrl(settings.pieceSet, p.color, p.type)}
            alt={`${p.color}${p.type}`}
            style={style}
            draggable={false}
          />
        );
      })}

      <svg className="nc-arrows" viewBox="0 0 100 100">
        {[...arrows, ...userShapes.arrows].map((a, i) => {
          const from = squareToXY(a.from, orientation);
          const to = squareToXY(a.to, orientation);
          const x1 = from.x * 12.5 + 6.25;
          const y1 = from.y * 12.5 + 6.25;
          const x2 = to.x * 12.5 + 6.25;
          const y2 = to.y * 12.5 + 6.25;
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const shorten = 3.4;
          const ex = x2 - shorten * Math.cos(angle);
          const ey = y2 - shorten * Math.sin(angle);
          const color = a.color ?? 'rgba(255, 170, 0, 0.8)';
          const headSize = 3.2;
          const hx1 = x2 - headSize * Math.cos(angle - 0.45);
          const hy1 = y2 - headSize * Math.sin(angle - 0.45);
          const hx2 = x2 - headSize * Math.cos(angle + 0.45);
          const hy2 = y2 - headSize * Math.sin(angle + 0.45);
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
              <polygon points={`${x2},${y2} ${hx1},${hy1} ${hx2},${hy2}`} fill={color} />
            </g>
          );
        })}
      </svg>

      {promotionPending && (
        <PromotionPicker
          color={turn}
          pieceSet={settings.pieceSet}
          onPick={(piece) => {
            const { from, to } = promotionPending;
            setPromotionPending(null);
            submitMove({ from, to, promotion: piece });
          }}
          onCancel={() => setPromotionPending(null)}
        />
      )}

      {pendingConfirm && (
        <div className="nc-confirm">
          <button
            className="primary"
            onClick={(e) => {
              e.stopPropagation();
              const m = pendingConfirm;
              setPendingConfirm(null);
              onMove(m);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            ✓ Confirmer
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPendingConfirm(null);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            ✗ Annuler
          </button>
        </div>
      )}
    </div>
  );
}

function PromotionPicker({
  color,
  pieceSet,
  onPick,
  onCancel,
}: {
  color: Color;
  pieceSet: string;
  onPick: (piece: PieceSymbol) => void;
  onCancel: () => void;
}) {
  const options: PieceSymbol[] = ['q', 'r', 'b', 'n'];
  return (
    <div className="nc-promotion-backdrop" onClick={onCancel} onPointerDown={(e) => e.stopPropagation()}>
      <div className="nc-promotion" onClick={(e) => e.stopPropagation()}>
        {options.map((p) => (
          <button key={p} className="nc-promotion-btn" onClick={() => onPick(p)}>
            <img src={pieceUrl(pieceSet, color, p)} alt={p} draggable={false} />
          </button>
        ))}
      </div>
    </div>
  );
}
