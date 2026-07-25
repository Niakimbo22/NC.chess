import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import Chessboard, { type Arrow, type BoardMove } from './board/Chessboard';
import EvalBar from './EvalBar';
import NeoAvatar from './NeoAvatar';
import MoveBadge from './MoveBadge';
import {
  GLOSSARY,
  MOVE_CLASS_INFO,
  coachTip,
  guidedStops,
  splitTip,
  type GameAnalysis,
} from '../engine/analysis';
import { useSettings } from '../store/settings';
import { speak } from '../coach/voice';
import './guidedReview.css';

/** Classifications pour lesquelles on montre d'office la meilleure alternative. */
const SHOW_BEST_AUTO = new Set(['miss', 'mistake', 'blunder']);

/** Classifications où « rejouer la position » a une vraie valeur pédagogique. */
const RETRYABLE = new Set(['inaccuracy', 'mistake', 'miss', 'blunder']);

type Retry =
  | { state: 'idle' }
  | { state: 'playing'; fen: string }
  | { state: 'won'; fen: string }
  | { state: 'failed'; fen: string; san: string };

/**
 * Revue guidée : Néo commente la partie coup marquant par coup marquant,
 * en une phrase, avec le vocabulaire cliquable et la possibilité de rejouer
 * soi-même la position. C'est le mode « bilan » : on avance avec un seul
 * bouton, on ne lit pas un rapport.
 */
export default function GuidedReview({
  analysis,
  white,
  black,
  onExit,
}: {
  analysis: GameAnalysis;
  white: string;
  black: string;
  onExit: () => void;
}) {
  const settings = useSettings();
  const stops = useMemo(() => guidedStops(analysis), [analysis]);
  const [step, setStep] = useState(0);
  const [showBest, setShowBest] = useState(false);
  const [term, setTerm] = useState<string | null>(null);
  const [retry, setRetry] = useState<Retry>({ state: 'idle' });
  const [flipped, setFlipped] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  const cursor = stops[Math.min(step, stops.length - 1)] ?? 0;
  const move = analysis.moves[cursor];
  const tip = useMemo(() => (move ? coachTip(move) : null), [move]);
  const info = move ? MOVE_CLASS_INFO[move.classification] : null;

  // Nouvelle étape : on repart d'une ardoise propre.
  useEffect(() => {
    setShowBest(false);
    setTerm(null);
    setRetry({ state: 'idle' });
  }, [cursor]);

  // Néo lit son commentaire à voix haute si la voix est activée.
  useEffect(() => {
    if (!tip || !settings.coachVoice) return;
    speak(`${tip.title}. ${tip.text.replace(/\[\[|\]\]/g, '')}`);
  }, [tip, settings.coachVoice]);

  // Garde le coup courant visible dans la bande de coups.
  useEffect(() => {
    stripRef.current?.querySelector('.gr-strip-move.current')?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [cursor]);

  if (!move || !tip || !info) {
    return (
      <div className="gr">
        <p>Rien à revoir dans cette partie.</p>
        <button onClick={onExit}>← Retour au bilan</button>
      </div>
    );
  }

  const inRetry = retry.state === 'playing' || retry.state === 'failed';
  const boardFen = retry.state === 'idle' ? move.fenAfter : retry.fen;
  const displayCp = retry.state === 'idle' ? move.cpAfter : move.cpBefore;

  // Pendant l'exercice on ne montre pas la solution d'office : sinon il n'y a
  // plus rien à chercher. Le bouton « Meilleur » reste là pour ceux qui sèchent.
  const wantsBest = showBest || (!inRetry && SHOW_BEST_AUTO.has(move.classification));
  const arrows: Arrow[] = [];
  if (tip.betterUci && wantsBest && retry.state !== 'won') {
    arrows.push({
      from: tip.betterUci.slice(0, 2) as Square,
      to: tip.betterUci.slice(2, 4) as Square,
      color: 'rgba(129, 182, 76, 0.85)',
    });
  }

  const played = { from: move.uci.slice(0, 2) as Square, to: move.uci.slice(2, 4) as Square };
  const highlights =
    retry.state === 'idle' && (move.classification === 'blunder' || move.classification === 'miss')
      ? [
          { square: played.from, color: 'rgba(224, 40, 40, 0.35)' },
          { square: played.to, color: 'rgba(224, 40, 40, 0.45)' },
        ]
      : [];

  const canRetry = RETRYABLE.has(move.classification) && !!tip.betterUci;
  const startRetry = () => setRetry({ state: 'playing', fen: move.fenBefore });

  const onRetryMove = (bm: BoardMove) => {
    const chess = new Chess(move.fenBefore);
    let san: string;
    try {
      san = chess.move({ from: bm.from, to: bm.to, promotion: bm.promotion }).san;
    } catch {
      return;
    }
    const uci = bm.from + bm.to + (bm.promotion ?? '');
    if (uci === move.bestMoveUci) {
      setRetry({ state: 'won', fen: chess.fen() });
    } else {
      // On remet la position d'origine : l'élève peut retenter tout de suite.
      setRetry({ state: 'failed', fen: move.fenBefore, san });
    }
  };

  const last = step >= stops.length - 1;
  const next = () => (last ? onExit() : setStep(step + 1));

  return (
    <div className="gr">
      <header className="gr-head">
        <button className="gr-back" onClick={onExit} aria-label="Retour au bilan">←</button>
        <span className="gr-progress">
          Moment {step + 1} / {stops.length}
        </span>
        <span className="gr-side">{move.color === 'w' ? white : black}</span>
        <button className="gr-flip" onClick={() => setFlipped(!flipped)} aria-label="Retourner l’échiquier">
          🔄
        </button>
      </header>

      <div className="gr-bubble-row">
        <NeoAvatar size={54} bob className="gr-neo" />
        <div className={`gr-bubble gr-bubble--${move.classification}`}>
          <div className="gr-bubble-head">
            <MoveBadge cls={move.classification} size={22} />
            <span className="gr-bubble-title">{tip.title}</span>
            <span className="gr-chip">{tip.chip}</span>
          </div>
          <p className="gr-bubble-text">
            {splitTip(tip.text).map((part, i) =>
              part.term ? (
                <button key={i} className="gr-term" onClick={() => setTerm(part.term!)}>
                  {part.text}
                </button>
              ) : (
                <span key={i}>{part.text}</span>
              )
            )}
          </p>
          {retry.state === 'won' && (
            <p className="gr-verdict gr-verdict--ok">🎉 Bravo, c’est exactement ça !</p>
          )}
          {retry.state === 'failed' && (
            <p className="gr-verdict gr-verdict--ko">
              {retry.san} n’est pas le bon. Rejoue depuis la même position, ou regarde la flèche avec « Meilleur ».
            </p>
          )}
          {retry.state === 'playing' && (
            <p className="gr-verdict gr-verdict--ask">
              À toi : rejoue la position et trouve le coup que le moteur voulait.
            </p>
          )}
        </div>
      </div>

      {term && (
        <div className="gr-glossary" role="note">
          <strong>{term}</strong>
          <p>{GLOSSARY[term] ?? 'Pas encore de définition pour ce mot.'}</p>
          <button className="gr-glossary-close" onClick={() => setTerm(null)} aria-label="Fermer">✕</button>
        </div>
      )}

      <div className="gr-board-row">
        {settings.showEvalBar && <EvalBar cp={displayCp} flipped={flipped} />}
        <Chessboard
          fen={boardFen}
          orientation={flipped ? 'b' : 'w'}
          playableColor={retry.state === 'playing' || retry.state === 'failed' ? move.color : null}
          onMove={onRetryMove}
          lastMove={retry.state === 'idle' ? played : null}
          arrows={arrows}
          highlights={highlights}
          badge={
            retry.state === 'idle'
              ? { square: played.to, symbol: info.symbol, color: info.color }
              : null
          }
        />
      </div>

      <div className="gr-strip" ref={stripRef}>
        {analysis.moves.map((m, i) => {
          const isStop = stops.includes(i);
          return (
            <button
              key={i}
              className={`gr-strip-move ${i === cursor ? 'current' : ''} ${isStop ? '' : 'muted'}`}
              onClick={() => {
                const at = stops.indexOf(i);
                if (at >= 0) setStep(at);
              }}
              disabled={!isStop}
            >
              {m.color === 'w' && <span className="gr-strip-num">{Math.floor(i / 2) + 1}.</span>}
              <span>{m.san}</span>
              <MoveBadge cls={m.classification} size={14} />
            </button>
          );
        })}
      </div>

      <div className="gr-actions">
        <button onClick={startRetry} disabled={retry.state === 'playing' || !canRetry}>
          ↻ Réessayer
        </button>
        <button
          onClick={() => setShowBest(!showBest)}
          disabled={!tip.betterUci}
          className={wantsBest ? 'active' : ''}
        >
          ★ Meilleur
        </button>
        <button className="primary gr-next" onClick={next}>
          {last ? 'Terminer' : 'Suivant'}
        </button>
      </div>

      {move.bestLineSan.length > 1 && wantsBest && (
        <p className="gr-line">
          <strong>La suite :</strong> {move.bestLineSan.join(' ')}
        </p>
      )}
    </div>
  );
}
