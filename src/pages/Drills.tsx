import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chess, type Color, type Square } from 'chess.js';
import Chessboard, { type Arrow, type BoardMove } from '../components/board/Chessboard';
import NeoAvatar from '../components/NeoAvatar';
import { DRILL_MODULES, type DrillChallenge, type DrillModule } from '../data/drills';
import { speak, stopSpeaking } from '../coach/voice';
import { capitalize, moveWordsFrom } from '../coach/moveWords';
import { useSettings } from '../store/settings';
import { playSound } from '../audio/sounds';
import './drills.css';

const SCORE_KEY = 'ncchess-drills';

/** Meilleur score par module : { captures: 8, mate1: 10, … } */
type Scores = Record<string, number>;

function loadScores(): Scores {
  try {
    return JSON.parse(localStorage.getItem(SCORE_KEY) ?? '{}') as Scores;
  } catch {
    return {};
  }
}

/** SAN en « figurine » (♖xf5) — comme dans les livres d'échecs. */
const FIG_W: Record<string, string> = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘' };
const FIG_B: Record<string, string> = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞' };
function figurine(san: string, color: Color): string {
  const map = color === 'w' ? FIG_W : FIG_B;
  return san.replace(/^[KQRBN]/, (m) => map[m]).replace(/=([QRBN])/, (_, p) => `=${map[p]}`);
}

export default function Drills() {
  const [module, setModule] = useState<DrillModule | null>(null);
  const [scores, setScores] = useState<Scores>(loadScores);

  const saveScore = useCallback((id: string, score: number) => {
    setScores((prev) => {
      if ((prev[id] ?? -1) >= score) return prev;
      const next = { ...prev, [id]: score };
      localStorage.setItem(SCORE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  if (module) {
    return (
      <DrillPlayer
        module={module}
        onDone={(score) => saveScore(module.id, score)}
        onExit={() => setModule(null)}
      />
    );
  }

  const total = DRILL_MODULES.reduce((n, m) => n + m.challenges.length, 0);
  const cleared = DRILL_MODULES.reduce((n, m) => n + Math.min(scores[m.id] ?? 0, m.challenges.length), 0);

  return (
    <div className="drills-page">
      <div className="drills-hero">
        <NeoAvatar size={68} spark bob />
        <div>
          <h1>🎯 Défis</h1>
          <p>
            Des exercices ciblés, une compétence à la fois. <strong className="gold-text">Néo</strong> est
            ton instructeur : il pose la consigne, corrige, et t’explique pourquoi.
          </p>
          <div className="drills-global">
            <div className="drills-globalbar">
              <div style={{ width: `${total ? (cleared / total) * 100 : 0}%` }} />
            </div>
            <span>{cleared}/{total} défis réussis</span>
          </div>
        </div>
      </div>

      <div className="drill-grid">
        {DRILL_MODULES.map((m) => {
          const score = scores[m.id] ?? 0;
          const done = score >= m.challenges.length;
          return (
            <button key={m.id} className={`drill-card ${done ? 'done' : ''}`} onClick={() => setModule(m)}>
              <span className="drill-card-icon">{m.icon}</span>
              <span className="drill-card-title">
                {m.title}
                {done && <span className="drill-card-check">✓</span>}
              </span>
              <span className="drill-card-desc">{m.summary}</span>
              <span className="drill-card-foot">
                <span className={`drill-level drill-level--${m.level.toLowerCase()}`}>{m.level}</span>
                <span className="drill-card-count">{score}/{m.challenges.length}</span>
              </span>
              <span className="drill-card-bar">
                <span style={{ width: `${(score / m.challenges.length) * 100}%` }} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Phase = 'intro' | 'playing' | 'finished';

function DrillPlayer({
  module,
  onDone,
  onExit,
}: {
  module: DrillModule;
  onDone: (score: number) => void;
  onExit: () => void;
}) {
  const settings = useSettings();
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [fen, setFen] = useState(module.challenges[0].fen);
  const [solved, setSolved] = useState(false);
  const [firstTry, setFirstTry] = useState(true);
  const [score, setScore] = useState(0);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [successSquare, setSuccessSquare] = useState<Square | null>(null);
  const [playedSan, setPlayedSan] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; kind: 'hint' | 'error' } | null>(null);
  const [showDemo, setShowDemo] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const challenge: DrillChallenge = module.challenges[index];
  const sideToMove = useMemo(() => new Chess(challenge.fen).turn(), [challenge.fen]);
  const isLast = index === module.challenges.length - 1;

  // Chaque nouveau défi repart d'une position propre.
  useEffect(() => {
    setFen(challenge.fen);
    setSolved(false);
    setFirstTry(true);
    setLastMove(null);
    setSuccessSquare(null);
    setPlayedSan(null);
    setFeedback(null);
    setShowDemo(true);
    if (phase === 'playing') speak(challenge.task);
    return () => {
      stopSpeaking();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, module.id, phase]);

  const onMove = useCallback(
    (bm: BoardMove) => {
      if (solved) return;
      const uci = bm.from + bm.to + (bm.promotion ?? '');
      const chess = new Chess(fen);
      let move;
      try {
        move = chess.move({ from: bm.from, to: bm.to, promotion: bm.promotion });
      } catch {
        return;
      }
      setShowDemo(false);

      if (challenge.accepted.includes(uci)) {
        setFen(chess.fen());
        setLastMove({ from: move.from, to: move.to });
        setSuccessSquare(move.to);
        // Le coup réussi est raconté, pas épelé : « ♘xf5 » n'apprend rien
        // à qui découvre la notation — elle reste entre parenthèses.
        setPlayedSan(capitalize(moveWordsFrom(move, { subject: 'neutral', san: figurine(move.san, sideToMove) })));
        setFeedback(null);
        setSolved(true);
        if (firstTry) setScore((s) => s + 1);
        playSound(chess.isCheckmate() ? 'Checkmate' : 'Confirmation');
        speak(challenge.success);
        return;
      }

      // Mauvais coup : on le montre une seconde, puis on remet la position.
      setFen(chess.fen());
      setLastMove({ from: move.from, to: move.to });
      setFirstTry(false);
      setFeedback({ text: challenge.hint, kind: 'error' });
      playSound('Error');
      timerRef.current = setTimeout(() => {
        setFen(challenge.fen);
        setLastMove(null);
      }, 850);
    },
    [challenge, fen, solved, firstTry, sideToMove]
  );

  const next = useCallback(() => {
    if (isLast) {
      onDone(score);
      setPhase('finished');
    } else {
      setIndex((i) => i + 1);
    }
  }, [isLast, onDone, score, setPhase]);

  const restart = useCallback(() => {
    setIndex(0);
    setScore(0);
    setPhase('playing');
  }, []);

  const arrows: Arrow[] =
    showDemo && challenge.demo && !solved
      ? [{ from: challenge.demo.from, to: challenge.demo.to, color: 'rgba(232, 140, 40, 0.9)' }]
      : [];

  // ---------- Écran d'introduction ----------
  if (phase === 'intro') {
    return (
      <div className="drill-layout">
        <DrillHeader module={module} onExit={onExit} />
        <div className="drill-board-col">
          <div className="drill-intro-board">
            <Chessboard
              fen={module.introFen}
              orientation={sideToMove}
              playableColor={null}
              onMove={() => {}}
              interactive={false}
            />
            <div className="drill-intro-veil" />
          </div>
        </div>
        <div className="drill-side-col">
          <div className="drill-bubble drill-bubble--intro">
            <NeoAvatar size={56} spark bob />
            <div className="drill-bubble-body">
              <span className="coach-name">Néo · ton instructeur</span>
              <p>{module.intro}</p>
            </div>
          </div>
          <p className="drill-intro-meta">
            {module.challenges.length} défis · niveau {module.level}
          </p>
          <button className="primary drill-start" onClick={() => setPhase('playing')}>
            Commencer
          </button>
          <button onClick={onExit}>← Tous les défis</button>
        </div>
      </div>
    );
  }

  // ---------- Écran de fin ----------
  if (phase === 'finished') {
    const perfect = score === module.challenges.length;
    return (
      <div className="drill-layout drill-layout--end">
        <DrillHeader module={module} onExit={onExit} />
        <div className="drill-finish">
          <NeoAvatar size={84} spark bob />
          <h2>{perfect ? 'Sans-faute ! ⚡' : 'Module terminé !'}</h2>
          <div className="drill-finish-score">
            <strong>{score}</strong> / {module.challenges.length}
          </div>
          <p>
            {perfect
              ? 'Tous les défis réussis du premier coup. Là, c’est du travail d’orfèvre — passe au module suivant !'
              : score >= module.challenges.length * 0.7
                ? 'Solide ! Refais le module pour viser le sans-faute : c’est en répétant que le motif devient un réflexe.'
                : 'C’est un début ! Ces motifs demandent de la répétition. Recommence, tu verras la différence.'}
          </p>
          <div className="drill-finish-actions">
            <button className="primary" onClick={restart}>↻ Recommencer</button>
            <button onClick={onExit}>← Tous les défis</button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Le défi ----------
  return (
    <div className="drill-layout">
      <DrillHeader module={module} onExit={onExit}>
        <span className="drill-count">Défi {index + 1}/{module.challenges.length}</span>
      </DrillHeader>

      <div className="drill-board-col">
        <div className="drill-progressbar">
          <div style={{ width: `${((index + (solved ? 1 : 0)) / module.challenges.length) * 100}%` }} />
        </div>
        <Chessboard
          fen={fen}
          orientation={sideToMove}
          playableColor={solved ? null : sideToMove}
          onMove={onMove}
          lastMove={lastMove}
          arrows={arrows}
          markedSquares={solved ? [] : (challenge.marks ?? [])}
          successSquare={successSquare}
        />
      </div>

      <div className="drill-side-col">
        <div className={`drill-bubble ${solved ? 'drill-bubble--ok' : ''} ${feedback?.kind === 'error' ? 'drill-bubble--ko' : ''}`}>
          <NeoAvatar size={48} bob={!solved} spark={solved} />
          <div className="drill-bubble-body">
            {solved ? (
              <>
                <span className="drill-verdict">
                  <span className="drill-verdict-check">✓</span> {playedSan}
                </span>
                <p>{challenge.success}</p>
              </>
            ) : (
              <>
                <span className={`drill-turn drill-turn--${sideToMove}`}>
                  Trait aux {sideToMove === 'w' ? 'Blancs' : 'Noirs'}
                </span>
                <p>{challenge.task}</p>
                {feedback && <p className={`drill-feedback ${feedback.kind}`}>{feedback.text}</p>}
              </>
            )}
          </div>
          {settings.coachVoice && (
            <button
              className="drill-replay"
              title="Réécouter"
              onClick={() => speak(solved ? challenge.success : challenge.task, { force: true })}
            >
              🔊
            </button>
          )}
        </div>

        {solved ? (
          <button className="primary drill-next" onClick={next}>
            {isLast ? '🎉 Terminer' : 'Suivant →'}
          </button>
        ) : (
          <button
            className="drill-hint-btn"
            onClick={() => {
              setFeedback({ text: challenge.hint, kind: 'hint' });
              speak(challenge.hint, { force: true });
            }}
          >
            💡 Indication
          </button>
        )}

        <div className="drill-dots">
          {module.challenges.map((_, i) => (
            <span
              key={i}
              className={`drill-dot ${i < index || (i === index && solved) ? 'ok' : ''} ${i === index ? 'now' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DrillHeader({
  module,
  onExit,
  children,
}: {
  module: DrillModule;
  onExit: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="drill-header">
      <button className="drill-back" onClick={onExit} title="Retour">←</button>
      <span className="drill-header-icon">{module.icon}</span>
      <strong>{module.title}</strong>
      {children}
      <Link to="/settings" className="drill-gear" title="Réglages">⚙️</Link>
    </div>
  );
}
