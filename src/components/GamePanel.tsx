import { useEffect, useMemo, useRef } from 'react';
import type { Color, Move } from 'chess.js';
import { formatClock } from '../game/timeControls';
import type { GameResult } from '../game/useChessGame';
import { END_REASON_FR } from '../game/useChessGame';
import { pieceUrl } from '../themes/boardThemes';
import { useSettings } from '../store/settings';
import NeoAvatar from './NeoAvatar';
import { neoGameOver } from '../mascot/neo';
import './gamePanel.css';

export function ClockDisplay({ ms, active, low }: { ms: number; active: boolean; low?: boolean }) {
  return (
    <div className={`gp-clock ${active ? 'active' : ''} ${low && ms < 20000 ? 'low' : ''}`}>
      {formatClock(ms)}
    </div>
  );
}

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

export function PlayerBar({
  name,
  rating,
  avatar,
  clockMs,
  clockActive,
  color,
  history,
  subtitle,
}: {
  name: string;
  rating?: number | null;
  avatar?: string;
  clockMs?: number | null;
  clockActive?: boolean;
  color: Color;
  history: Move[];
  subtitle?: string;
}) {
  const settings = useSettings();
  // Pièces capturées PAR ce joueur + différence de matériel
  const { captured, diff } = useMemo(() => {
    const mine: string[] = [];
    let myPoints = 0;
    let theirPoints = 0;
    for (const m of history) {
      if (!m.captured) continue;
      if (m.color === color) {
        mine.push(m.captured);
        myPoints += PIECE_VALUES[m.captured] ?? 0;
      } else {
        theirPoints += PIECE_VALUES[m.captured] ?? 0;
      }
    }
    mine.sort((a, b) => (PIECE_VALUES[b] ?? 0) - (PIECE_VALUES[a] ?? 0));
    return { captured: mine, diff: myPoints - theirPoints };
  }, [history, color]);

  const opponentColor: Color = color === 'w' ? 'b' : 'w';

  return (
    <div className="gp-playerbar">
      <div className="gp-avatar">{avatar ?? (color === 'w' ? '♔' : '♚')}</div>
      <div className="gp-player-info">
        <div className="gp-player-name">
          {name}
          {rating != null && <span className="gp-rating">({rating})</span>}
        </div>
        {subtitle ? (
          <div className="gp-subtitle">{subtitle}</div>
        ) : (
          <div className="gp-captured">
            {captured.map((c, i) => (
              <img key={i} src={pieceUrl(settings.pieceSet, opponentColor, c)} alt={c} />
            ))}
            {diff > 0 && <span className="gp-diff">+{diff}</span>}
          </div>
        )}
      </div>
      {clockMs != null && <ClockDisplay ms={clockMs} active={!!clockActive} low />}
    </div>
  );
}

export function MoveList({
  history,
  viewIndex,
  onSelect,
}: {
  history: Move[];
  viewIndex: number;
  onSelect: (index: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const currentIndex = viewIndex < 0 ? history.length - 1 : viewIndex;

  useEffect(() => {
    const el = listRef.current?.querySelector('.current');
    el?.scrollIntoView({ block: 'nearest' });
  }, [currentIndex]);

  const rows = [];
  for (let i = 0; i < history.length; i += 2) {
    rows.push(
      <div className="gp-move-row" key={i}>
        <span className="gp-move-num">{i / 2 + 1}.</span>
        <button
          className={`gp-move ${currentIndex === i ? 'current' : ''}`}
          onClick={() => onSelect(i)}
        >
          {history[i].san}
        </button>
        {history[i + 1] ? (
          <button
            className={`gp-move ${currentIndex === i + 1 ? 'current' : ''}`}
            onClick={() => onSelect(i + 1)}
          >
            {history[i + 1].san}
          </button>
        ) : (
          <span />
        )}
      </div>
    );
  }

  return (
    <div className="gp-movelist" ref={listRef}>
      {rows.length === 0 ? <div className="gp-empty">La partie va commencer…</div> : rows}
    </div>
  );
}

export function NavButtons({
  historyLength,
  viewIndex,
  onGoTo,
}: {
  historyLength: number;
  viewIndex: number;
  onGoTo: (index: number) => void;
}) {
  // pointeur : -1 = position initiale, 0..n-1 = après le coup i
  const pointer = viewIndex === -2 ? -1 : viewIndex === -1 ? historyLength - 1 : viewIndex;
  const atEnd = pointer >= historyLength - 1;
  return (
    <div className="gp-nav">
      <button onClick={() => onGoTo(-2)} disabled={pointer < 0} title="Début">⏮</button>
      <button onClick={() => onGoTo(pointer <= 0 ? -2 : pointer - 1)} disabled={pointer < 0} title="Précédent">◀</button>
      <button onClick={() => onGoTo(pointer + 1)} disabled={atEnd} title="Suivant">▶</button>
      <button onClick={() => onGoTo(-1)} disabled={atEnd} title="Fin">⏭</button>
    </div>
  );
}

export function GameOverModal({
  result,
  playerColor,
  onRematch,
  onNewGame,
  onClose,
  onAnalyze,
  whiteName,
  blackName,
  eloChange,
}: {
  result: GameResult;
  playerColor: Color | 'both';
  onRematch?: () => void;
  onNewGame?: () => void;
  onClose: () => void;
  onAnalyze?: () => void;
  whiteName: string;
  blackName: string;
  eloChange?: number | null;
}) {
  let title: string;
  let emoji: string;
  let outcome: 'win' | 'loss' | 'draw';
  if (result.winner === null) {
    title = 'Partie nulle';
    emoji = '🤝';
    outcome = 'draw';
  } else if (playerColor === 'both') {
    title = `${result.winner === 'w' ? whiteName : blackName} gagne !`;
    emoji = '🏆';
    outcome = 'win';
  } else if (result.winner === playerColor) {
    title = 'Victoire !';
    emoji = '🎉';
    outcome = 'win';
  } else {
    title = 'Défaite';
    emoji = '😔';
    outcome = 'loss';
  }
  const neoLine = useMemo(() => neoGameOver(outcome), [outcome]);

  return (
    <div className="gp-modal-backdrop" onClick={onClose}>
      <div className="gp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gp-modal-emoji">{emoji}</div>
        <h2>{title}</h2>
        <p className="gp-modal-reason">{END_REASON_FR[result.reason]}</p>
        {eloChange != null && (
          <p className={`gp-elo-change ${eloChange >= 0 ? 'up' : 'down'}`}>
            {eloChange >= 0 ? '+' : ''}{eloChange} Elo
          </p>
        )}
        <div className="gp-modal-neo">
          <NeoAvatar size={40} bob />
          <p>{neoLine}</p>
        </div>
        <div className="gp-modal-actions">
          {onRematch && <button className="primary" onClick={onRematch}>Revanche</button>}
          {onAnalyze && <button onClick={onAnalyze}>📊 Analyser la partie</button>}
          {onNewGame && <button onClick={onNewGame}>Nouvelle partie</button>}
          <button onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
