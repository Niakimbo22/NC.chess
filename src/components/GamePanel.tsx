import { useCallback, useEffect, useMemo, useRef } from 'react';
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

/**
 * Bandeau « tu regardes un coup passé ». Sans lui, naviguer dans l'historique
 * verrouille l'échiquier sans rien dire : sur mobile la liste des coups vit dans
 * le tiroir, donc une fois celui-ci refermé plus rien n'indique pourquoi on ne
 * peut plus jouer, ni comment revenir. Le bouton est le retour de secours.
 */
export function ReviewBanner({
  viewIndex,
  history,
  onReturn,
}: {
  viewIndex: number;
  history: Move[];
  onReturn: () => void;
}) {
  if (viewIndex === -1) return null;
  const ply = viewIndex === -2 ? 0 : viewIndex + 1;
  const behind = history.length - ply;
  // Le coup regardé, en notation habituelle : « 4.d4 » pour les blancs,
  // « 4…exd4 » pour les noirs. Bien plus parlant qu'un numéro de demi-coup.
  const label = ply === 0
    ? 'position de départ'
    : `${Math.ceil(ply / 2)}${ply % 2 ? '.' : '…'}${history[ply - 1].san}`;
  return (
    <div className="gp-review-banner">
      <span className="gp-review-label">
        👁 Revue — {label}
        <em>{behind} coup{behind > 1 ? 's' : ''} plus loin dans la partie</em>
      </span>
      <button className="gp-review-back" onClick={onReturn}>Revenir à la partie ⏭</button>
    </div>
  );
}

/**
 * Barre de relecture, collée sous l'échiquier — les deux flèches de chess.com.
 *
 * Elle est volontairement HORS du tiroir « Coups & options » : revoir le coup
 * de l'adversaire est un geste qu'on fait en pleine partie, une fois par coup ;
 * il ne doit pas coûter deux tapotements et la fermeture d'un panneau. Rien
 * n'est modifié dans la partie : la pendule tourne, l'adversaire joue, on ne
 * fait que déplacer la fenêtre d'affichage — et « ⏭ » ramène au direct.
 */
export function MoveNav({
  history,
  viewIndex,
  onGoTo,
}: {
  history: Move[];
  viewIndex: number;
  onGoTo: (index: number) => void;
}) {
  // pointeur : -1 = position initiale, 0..n-1 = après le demi-coup i
  const pointer = viewIndex === -2 ? -1 : viewIndex === -1 ? history.length - 1 : viewIndex;
  const atStart = pointer < 0;
  const atEnd = pointer >= history.length - 1;
  const live = viewIndex === -1;

  const prev = useCallback(() => { if (!atStart) onGoTo(pointer <= 0 ? -2 : pointer - 1); }, [atStart, pointer, onGoTo]);
  const next = useCallback(() => { if (!atEnd) onGoTo(pointer + 1); }, [atEnd, pointer, onGoTo]);

  // Au clavier aussi : ← → pour parcourir, Début/Fin pour les extrémités.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Home') onGoTo(-2);
      else if (e.key === 'End') onGoTo(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, onGoTo]);

  // Étiquette centrale : le coup regardé en notation habituelle.
  let label: string;
  if (history.length === 0) label = 'Aucun coup';
  else if (live) label = 'En direct';
  else if (pointer < 0) label = 'Position de départ';
  else {
    const ply = pointer + 1;
    label = `${Math.ceil(ply / 2)}${ply % 2 ? '.' : '…'} ${history[ply - 1].san}`;
  }

  return (
    <div className={`gp-boardnav ${live ? '' : 'reviewing'}`}>
      <button onClick={() => onGoTo(-2)} disabled={atStart} title="Début de la partie" aria-label="Début de la partie">⏮</button>
      <button onClick={prev} disabled={atStart} title="Coup précédent" aria-label="Coup précédent">◀</button>
      <span className="gp-boardnav-label">{label}</span>
      <button onClick={next} disabled={atEnd} title="Coup suivant" aria-label="Coup suivant">▶</button>
      <button
        className={live ? '' : 'accent'}
        onClick={() => onGoTo(-1)}
        disabled={atEnd}
        title="Revenir au direct"
        aria-label="Revenir au direct"
      >
        ⏭
      </button>
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
