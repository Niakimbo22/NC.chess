import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Color, type Square } from 'chess.js';
import Chessboard, { type Arrow, type BoardMove } from '../components/board/Chessboard';
import {
  loadPuzzles,
  pickPuzzle,
  dailyPuzzle,
  THEME_FR,
  FILTERABLE_THEMES,
  type Puzzle,
} from '../data/puzzleDb';
import { useProfile } from '../store/profile';
import { playSound } from '../audio/sounds';
import './puzzles.css';

type Tab = 'training' | 'rush' | 'daily';

export default function Puzzles() {
  const [tab, setTab] = useState<Tab>('training');
  const [pool, setPool] = useState<Puzzle[] | null>(null);

  useEffect(() => {
    loadPuzzles().then(setPool);
  }, []);

  if (!pool) {
    return <div style={{ textAlign: 'center', paddingTop: 80 }}><h1>🧩 Chargement des puzzles…</h1></div>;
  }

  return (
    <div className="puzzles-page">
      <div className="puzzle-tabs">
        <button className={tab === 'training' ? 'active' : ''} onClick={() => setTab('training')}>🎯 Entraînement</button>
        <button className={tab === 'rush' ? 'active' : ''} onClick={() => setTab('rush')}>⚡ Puzzle Rush</button>
        <button className={tab === 'daily' ? 'active' : ''} onClick={() => setTab('daily')}>📅 Puzzle du jour</button>
      </div>
      {tab === 'training' && <Training pool={pool} />}
      {tab === 'rush' && <Rush pool={pool} />}
      {tab === 'daily' && <Daily pool={pool} />}
    </div>
  );
}

// ------------------------------------------------------------- solveur commun

type SolveState = 'playing' | 'solved' | 'failed';

interface SolverCallbacks {
  onSolved: (firstTry: boolean) => void;
  onFirstMistake?: () => void;
}

function usePuzzleSolver(puzzle: Puzzle | null, cb: SolverCallbacks) {
  const chessRef = useRef<Chess>(new Chess());
  const [fen, setFen] = useState('');
  const [moveIndex, setMoveIndex] = useState(0);
  const [state, setState] = useState<SolveState>('playing');
  const [mistakeMade, setMistakeMade] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [wrongSquare, setWrongSquare] = useState<Square | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [playerColor, setPlayerColor] = useState<Color>('w');
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  };

  // Initialisation du puzzle : position, puis coup adverse automatique
  useEffect(() => {
    if (!puzzle) return;
    clearTimers();
    const chess = new Chess(puzzle.fen);
    chessRef.current = chess;
    setFen(chess.fen());
    setState('playing');
    setMistakeMade(false);
    setHintLevel(0);
    setWrongSquare(null);
    setLastMove(null);
    setMoveIndex(0);
    setPlayerColor(chess.turn() === 'w' ? 'b' : 'w');
    const t = setTimeout(() => {
      const first = puzzle.moves[0];
      const m = chess.move({ from: first.slice(0, 2), to: first.slice(2, 4), promotion: first.length > 4 ? (first[4] as 'q') : undefined });
      setFen(chess.fen());
      setLastMove({ from: m.from, to: m.to });
      setMoveIndex(1);
      playSound(m.captured ? 'Capture' : 'Move');
    }, 600);
    timeouts.current.push(t);
    return clearTimers;
  }, [puzzle]);

  const onMove = useCallback(
    (bm: BoardMove) => {
      if (!puzzle || state !== 'playing') return;
      const chess = chessRef.current;
      const expected = puzzle.moves[moveIndex];
      const uci = bm.from + bm.to + (bm.promotion ?? '');

      let move;
      try {
        move = chess.move({ from: bm.from, to: bm.to, promotion: bm.promotion });
      } catch {
        return;
      }

      const isExpected = uci === expected;
      const isAltMate = !isExpected && chess.isCheckmate();

      if (isExpected || isAltMate) {
        setFen(chess.fen());
        setLastMove({ from: move.from, to: move.to });
        setHintLevel(0);
        playSound(chess.isCheckmate() ? 'Checkmate' : chess.inCheck() ? 'Check' : move.captured ? 'Capture' : 'Move');
        const nextIndex = moveIndex + 1;
        if (isAltMate || nextIndex >= puzzle.moves.length) {
          setState('solved');
          playSound('Victory');
          cb.onSolved(!mistakeMade);
          return;
        }
        setMoveIndex(nextIndex);
        // Réponse adverse
        const t = setTimeout(() => {
          const reply = puzzle.moves[nextIndex];
          const rm = chess.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: reply.length > 4 ? (reply[4] as 'q') : undefined });
          setFen(chess.fen());
          setLastMove({ from: rm.from, to: rm.to });
          setMoveIndex(nextIndex + 1);
          playSound(rm.captured ? 'Capture' : 'Move');
        }, 450);
        timeouts.current.push(t);
      } else {
        // Mauvais coup : marque, annule, laisse réessayer
        setFen(chess.fen());
        setWrongSquare(move.to);
        playSound('Error');
        if (!mistakeMade) {
          setMistakeMade(true);
          cb.onFirstMistake?.();
        }
        const t = setTimeout(() => {
          chess.undo();
          setFen(chess.fen());
          setWrongSquare(null);
        }, 700);
        timeouts.current.push(t);
      }
    },
    [puzzle, state, moveIndex, mistakeMade, cb]
  );

  const showSolution = useCallback(() => {
    if (!puzzle || state !== 'playing') return;
    if (!mistakeMade) {
      setMistakeMade(true);
      cb.onFirstMistake?.();
    }
    const chess = chessRef.current;
    let idx = moveIndex;
    const step = () => {
      if (idx >= puzzle.moves.length) {
        setState('failed');
        return;
      }
      const u = puzzle.moves[idx];
      const m = chess.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? (u[4] as 'q') : undefined });
      setFen(chess.fen());
      setLastMove({ from: m.from, to: m.to });
      idx++;
      timeouts.current.push(setTimeout(step, 650));
    };
    step();
  }, [puzzle, state, moveIndex, mistakeMade, cb]);

  const hint = useCallback(() => {
    if (!puzzle || state !== 'playing') return;
    setHintLevel((h) => Math.min(2, h + 1));
  }, [puzzle, state]);

  const hintData = useMemo((): { marked: Square[]; arrows: Arrow[] } => {
    if (!puzzle || hintLevel === 0 || state !== 'playing') return { marked: [], arrows: [] };
    const expected = puzzle.moves[moveIndex];
    if (!expected) return { marked: [], arrows: [] };
    const from = expected.slice(0, 2) as Square;
    const to = expected.slice(2, 4) as Square;
    if (hintLevel === 1) return { marked: [from], arrows: [] };
    return { marked: [], arrows: [{ from, to, color: 'rgba(61, 159, 232, 0.85)' }] };
  }, [puzzle, hintLevel, moveIndex, state]);

  return { fen, state, playerColor, lastMove, wrongSquare, onMove, showSolution, hint, hintData, mistakeMade };
}

function PuzzleBoardPanel({
  solver,
  children,
}: {
  solver: ReturnType<typeof usePuzzleSolver>;
  children: React.ReactNode;
}) {
  return (
    <div className="puzzle-layout">
      <div className="puzzle-board">
        <Chessboard
          fen={solver.fen || new Chess().fen()}
          orientation={solver.playerColor}
          playableColor={solver.state === 'playing' ? solver.playerColor : null}
          onMove={solver.onMove}
          lastMove={solver.lastMove}
          markedSquares={[...(solver.wrongSquare ? [solver.wrongSquare] : []), ...solver.hintData.marked]}
          arrows={solver.hintData.arrows}
        />
      </div>
      <div className="puzzle-side">{children}</div>
    </div>
  );
}

// ------------------------------------------------------------- entraînement

function Training({ pool }: { pool: Puzzle[] }) {
  const profile = useProfile();
  const [theme, setTheme] = useState<string | null>(null);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [streak, setStreak] = useState(0);
  const [lastDelta, setLastDelta] = useState<number | null>(null);
  const seenRef = useRef(new Set<string>());
  const scoredRef = useRef(false);

  const next = useCallback(() => {
    const p = pickPuzzle(pool, { rating: useProfile.getState().puzzleElo, theme, exclude: seenRef.current });
    if (p) {
      seenRef.current.add(p.id);
      scoredRef.current = false;
      setLastDelta(null);
      setPuzzle(p);
    }
  }, [pool, theme]);

  useEffect(() => { next(); }, [next]);

  const solver = usePuzzleSolver(puzzle, {
    onSolved: (firstTry) => {
      if (!scoredRef.current && puzzle) {
        scoredRef.current = true;
        if (firstTry) {
          const delta = profile.recordPuzzle(puzzle.rating, true);
          setLastDelta(delta);
          setStreak((s) => s + 1);
        }
      }
    },
    onFirstMistake: () => {
      if (!scoredRef.current && puzzle) {
        scoredRef.current = true;
        const delta = profile.recordPuzzle(puzzle.rating, false);
        setLastDelta(delta);
        setStreak(0);
      }
    },
  });

  return (
    <PuzzleBoardPanel solver={solver}>
      <div className="panel puzzle-info">
        <div className="puzzle-elo-row">
          <div>
            <span className="puzzle-elo">{profile.puzzleElo}</span>
            <span className="puzzle-elo-label"> Elo puzzle</span>
            {lastDelta != null && (
              <span className={`puzzle-delta ${lastDelta >= 0 ? 'up' : 'down'}`}>
                {lastDelta >= 0 ? '+' : ''}{lastDelta}
              </span>
            )}
          </div>
          <div className="puzzle-streak" title="Série en cours">🔥 {streak}</div>
        </div>
        {puzzle && (
          <>
            <p className="puzzle-goal">
              {solver.state === 'solved'
                ? '✅ Résolu ! Bien joué.'
                : solver.state === 'failed'
                ? 'Voici la solution. Retiens l’idée !'
                : `${solver.playerColor === 'w' ? 'Les blancs' : 'Les noirs'} jouent et gagnent.`}
            </p>
            <div className="puzzle-themes">
              {puzzle.themes.slice(0, 4).map((t) => (
                <span key={t} className="puzzle-theme-chip">{THEME_FR[t] ?? t}</span>
              ))}
            </div>
            {(solver.state !== 'playing') && (
              <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Difficulté du puzzle : {puzzle.rating}</p>
            )}
          </>
        )}
      </div>
      <label className="panel puzzle-filter">
        Thème :
        <select value={theme ?? ''} onChange={(e) => setTheme(e.target.value || null)}>
          <option value="">Tous les thèmes</option>
          {FILTERABLE_THEMES.map((t) => (
            <option key={t} value={t}>{THEME_FR[t] ?? t}</option>
          ))}
        </select>
      </label>
      <div className="game-actions">
        {solver.state === 'playing' ? (
          <>
            <button onClick={solver.hint}>💡 Indice</button>
            <button onClick={solver.showSolution}>👀 Solution</button>
          </>
        ) : (
          <button className="primary" onClick={next}>Puzzle suivant →</button>
        )}
      </div>
    </PuzzleBoardPanel>
  );
}

// ------------------------------------------------------------- puzzle rush

const RUSH_DURATION = 5 * 60 * 1000;

function Rush({ pool }: { pool: Puzzle[] }) {
  const profile = useProfile();
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [timeLeft, setTimeLeft] = useState(RUSH_DURATION);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [finished, setFinished] = useState(false);
  const ratingRef = useRef(600);
  const seenRef = useRef(new Set<string>());

  const nextPuzzle = useCallback(() => {
    const p = pickPuzzle(pool, { rating: ratingRef.current, spread: 120, exclude: seenRef.current });
    if (p) {
      seenRef.current.add(p.id);
      setPuzzle(p);
    }
  }, [pool]);

  const start = () => {
    setRunning(true);
    setFinished(false);
    setScore(0);
    setStrikes(0);
    setTimeLeft(RUSH_DURATION);
    ratingRef.current = 600;
    seenRef.current = new Set();
    nextPuzzle();
  };

  const endRush = useCallback(() => {
    setRunning(false);
    setFinished(true);
    setPuzzle(null);
    profile.recordRushScore(score);
    playSound(score > 0 ? 'Victory' : 'Defeat');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1000) {
          clearInterval(iv);
          endRush();
          return 0;
        }
        return t - 1000;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [running, endRush]);

  const solver = usePuzzleSolver(puzzle, {
    onSolved: () => {
      setScore((s) => s + 1);
      ratingRef.current += 60;
      setTimeout(nextPuzzle, 700);
    },
    onFirstMistake: () => {
      setStrikes((k) => {
        const nk = k + 1;
        if (nk >= 3) {
          setTimeout(endRush, 600);
        } else {
          setTimeout(nextPuzzle, 700);
        }
        return nk;
      });
    },
  });

  if (!running) {
    return (
      <div className="rush-splash panel">
        <h2>⚡ Puzzle Rush</h2>
        <p>Résous un maximum de puzzles en 5 minutes. 3 erreurs et c'est fini !</p>
        <p>Record : <strong>{profile.puzzleRushBest}</strong></p>
        {finished && <p className="rush-final">Score : <strong>{score}</strong> {score > profile.puzzleRushBest ? '🎉 Nouveau record !' : ''}</p>}
        <button className="primary" style={{ fontSize: 18 }} onClick={start}>{finished ? 'Rejouer' : 'Démarrer'}</button>
      </div>
    );
  }

  const min = Math.floor(timeLeft / 60000);
  const sec = Math.floor((timeLeft % 60000) / 1000);

  return (
    <PuzzleBoardPanel solver={solver}>
      <div className="panel puzzle-info">
        <div className="rush-header">
          <span className={`rush-timer ${timeLeft < 30000 ? 'low' : ''}`}>{min}:{String(sec).padStart(2, '0')}</span>
          <span className="rush-score">{score}</span>
          <span className="rush-strikes">
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < strikes ? 'strike used' : 'strike'}>✗</span>
            ))}
          </span>
        </div>
        <p className="puzzle-goal">
          {solver.playerColor === 'w' ? 'Les blancs jouent.' : 'Les noirs jouent.'}
        </p>
      </div>
      <button onClick={endRush}>Arrêter</button>
    </PuzzleBoardPanel>
  );
}

// ------------------------------------------------------------- puzzle du jour

function Daily({ pool }: { pool: Puzzle[] }) {
  const puzzle = useMemo(() => dailyPuzzle(pool), [pool]);
  const todayKey = new Date().toISOString().slice(0, 10);
  const [done, setDone] = useState(() => localStorage.getItem('ncchess-daily') === todayKey);

  const solver = usePuzzleSolver(puzzle, {
    onSolved: () => {
      localStorage.setItem('ncchess-daily', todayKey);
      setDone(true);
    },
  });

  return (
    <PuzzleBoardPanel solver={solver}>
      <div className="panel puzzle-info">
        <h2>📅 Puzzle du jour</h2>
        <p style={{ color: 'var(--text-dim)' }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        {done && solver.state !== 'playing' ? (
          <p className="puzzle-goal">✅ Puzzle du jour réussi ! Reviens demain.</p>
        ) : done ? (
          <p className="puzzle-goal">Déjà résolu aujourd'hui — mais tu peux le refaire !</p>
        ) : (
          <p className="puzzle-goal">{solver.playerColor === 'w' ? 'Les blancs' : 'Les noirs'} jouent et gagnent.</p>
        )}
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Difficulté : {puzzle.rating}</p>
      </div>
      <div className="game-actions">
        {solver.state === 'playing' && (
          <>
            <button onClick={solver.hint}>💡 Indice</button>
            <button onClick={solver.showSolution}>👀 Solution</button>
          </>
        )}
      </div>
    </PuzzleBoardPanel>
  );
}
