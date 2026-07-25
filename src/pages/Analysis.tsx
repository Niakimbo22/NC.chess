import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Chess, validateFen, type Square } from 'chess.js';
import Chessboard, { type Arrow } from '../components/board/Chessboard';
import EvalBar from '../components/EvalBar';
import NeoAvatar from '../components/NeoAvatar';
import { Engine, evalToWhiteCp } from '../engine/engine';
import {
  analyzeGame,
  buildReviewSummary,
  coachComment,
  MOVE_CLASS_INFO,
  MOVE_CLASS_ORDER,
  type GameAnalysis,
  type MoveClass,
  type ReviewSummary,
} from '../engine/analysis';
import MoveBadge from '../components/MoveBadge';
import GameReport from '../components/GameReport';
import GuidedReview from '../components/GuidedReview';
import { loadOpenings, findOpening, bookDepth } from '../data/openingBook';
import { loadGameHistory } from '../store/gameHistory';
import { useSettings } from '../store/settings';
import { speak } from '../coach/voice';
import './analysis.css';

type Mode =
  | { kind: 'home' }
  | { kind: 'review'; sans: string[]; white: string; black: string }
  | { kind: 'free'; fen?: string };

export default function Analysis() {
  const location = useLocation();
  const statePgn: string | undefined = (location.state as { pgn?: string } | null)?.pgn;
  const [mode, setMode] = useState<Mode>(() => {
    if (statePgn) {
      const sans = pgnToSans(statePgn);
      if (sans) return { kind: 'review', sans, white: 'Blancs', black: 'Noirs' };
    }
    return { kind: 'home' };
  });

  if (mode.kind === 'review') {
    return <ReviewView sans={mode.sans} white={mode.white} black={mode.black} onBack={() => setMode({ kind: 'home' })} />;
  }
  if (mode.kind === 'free') {
    return <FreeBoard startFen={mode.fen} onBack={() => setMode({ kind: 'home' })} />;
  }
  return <AnalysisHome onSelect={setMode} />;
}

function pgnToSans(pgn: string): string[] | null {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    return chess.history();
  } catch {
    return null;
  }
}

function AnalysisHome({ onSelect }: { onSelect: (m: Mode) => void }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const games = useMemo(() => loadGameHistory(), []);

  const analyze = () => {
    const text = input.trim();
    if (!text) return;
    // FEN ?
    if (validateFen(text).ok) {
      onSelect({ kind: 'free', fen: text });
      return;
    }
    const sans = pgnToSans(text);
    if (sans && sans.length > 0) {
      onSelect({ kind: 'review', sans, white: 'Blancs', black: 'Noirs' });
    } else {
      setError('Impossible de lire ce PGN / FEN. Vérifie le format.');
    }
  };

  return (
    <div className="analysis-home">
      <h1>📊 Analyse</h1>
      <div className="panel">
        <h2>Colle un PGN ou un FEN</h2>
        <textarea
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(''); }}
          placeholder={'1. e4 e5 2. Nf3 Nc6 3. Bb5 a6…\nou\nrnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}
          rows={5}
        />
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button className="primary" onClick={analyze}>🔍 Analyser</button>
          <button onClick={() => onSelect({ kind: 'free' })}>♟️ Plateau libre</button>
        </div>
      </div>
      {games.length > 0 && (
        <div className="panel">
          <h2>Mes parties récentes</h2>
          <div className="game-history">
            {games.slice(0, 12).map((g) => (
              <div key={g.id} className="game-row">
                <div className="game-info">
                  <span>{g.white} vs {g.black}</span>
                  <span className="game-meta">{new Date(g.date).toLocaleDateString('fr-FR')} · {g.result ?? ''}</span>
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    const sans = pgnToSans(g.pgn);
                    if (sans) onSelect({ kind: 'review', sans, white: g.white, black: g.black });
                  }}
                >
                  Analyser
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Revue

function ReviewView({ sans, white, black, onBack }: { sans: string[]; white: string; black: string; onBack: () => void }) {
  const settings = useSettings();
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [progress, setProgress] = useState(0);
  const [depth, setDepth] = useState(12);
  const [started, setStarted] = useState(false);
  const [cursor, setCursor] = useState(-1); // -1 = position initiale, i = après le coup i
  const [flipped, setFlipped] = useState(false);
  const [exploreFen, setExploreFen] = useState<string | null>(null);
  const [exploreFromMove, setExploreFromMove] = useState(0);
  const [view, setView] = useState<'report' | 'guided' | 'details'>('report');
  const [bookPlies, setBookPlies] = useState(0);
  const engineRef = useRef<Engine | null>(null);
  const signalRef = useRef({ cancelled: false });

  // Charge le livre d'ouvertures avant l'analyse : les coups de théorie sont
  // classés « Théorique » plutôt que jugés au centipion près.
  useEffect(() => {
    let alive = true;
    loadOpenings().then(() => {
      if (alive) setBookPlies(bookDepth(sans));
    });
    return () => { alive = false; };
  }, [sans]);

  // Construit le bilan narratif dès que l'analyse est prête (avec l'ouverture).
  useEffect(() => {
    if (!analysis) return;
    let alive = true;
    loadOpenings().then(() => {
      if (!alive) return;
      const opening = findOpening(sans);
      setSummary(buildReviewSummary(analysis, white, black, opening?.name));
    });
    return () => { alive = false; };
  }, [analysis, sans, white, black]);

  useEffect(() => {
    // Ré-arme le signal après le cycle montage/démontage de StrictMode
    signalRef.current.cancelled = false;
    return () => {
      signalRef.current.cancelled = true;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const run = useCallback(async () => {
    setStarted(true);
    const engine = new Engine();
    engineRef.current = engine;
    const result = await analyzeGame(sans, engine, {
      depth,
      bookPlies,
      onProgress: (done, total) => setProgress(Math.round((done / total) * 100)),
      signal: signalRef.current,
    });
    if (result) {
      setAnalysis(result);
      setCursor(result.moves.length - 1);
      setView('report');
    }
  }, [sans, depth, bookPlies]);

  if (!started) {
    return (
      <div className="analysis-home">
        <h1>📊 Analyse de la partie</h1>
        <div className="panel" style={{ textAlign: 'center' }}>
          <p>{sans.length} coups à analyser avec Stockfish.</p>
          <label style={{ display: 'block', margin: '12px 0' }}>
            Profondeur :{' '}
            <select value={depth} onChange={(e) => setDepth(Number(e.target.value))}>
              <option value={10}>Rapide (profondeur 10)</option>
              <option value={12}>Standard (profondeur 12)</option>
              <option value={16}>Approfondie (profondeur 16, plus lent)</option>
            </select>
          </label>
          <button className="primary" style={{ fontSize: 17 }} onClick={run}>🚀 Lancer l'analyse</button>
          <button style={{ marginLeft: 8 }} onClick={onBack}>Retour</button>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="analysis-home">
        <h1>📊 Analyse en cours…</h1>
        <div className="panel" style={{ textAlign: 'center' }}>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          <p style={{ color: 'var(--text-dim)' }}>{progress} % — Stockfish examine chaque position</p>
        </div>
      </div>
    );
  }

  if (view === 'report') {
    return (
      <GameReport
        analysis={analysis}
        summary={summary}
        white={white}
        black={black}
        bookPlies={bookPlies}
        onStartGuided={() => setView('guided')}
        onOpenDetails={() => setView('details')}
        onSeek={(c) => { setCursor(c); setView('details'); }}
        onBack={onBack}
      />
    );
  }

  if (view === 'guided') {
    return <GuidedReview analysis={analysis} white={white} black={black} onExit={() => setView('report')} />;
  }

  const current = cursor >= 0 ? analysis.moves[cursor] : null;
  const fen = current ? current.fenAfter : analysis.moves[0]?.fenBefore ?? new Chess().fen();
  const cp = current ? current.cpAfter : analysis.initialCp;

  // Mode « Et si ? » : explorer un scénario alternatif depuis la position courante.
  if (exploreFen) {
    return (
      <ExploreBoard
        startFen={exploreFen}
        fromMoveNo={exploreFromMove}
        orientation={flipped ? 'b' : 'w'}
        onClose={() => setExploreFen(null)}
      />
    );
  }

  const arrows: Arrow[] = [];
  if (current && current.classification !== 'best' && current.classification !== 'brilliant' && current.bestMoveUci.length >= 4) {
    arrows.push({
      from: current.bestMoveUci.slice(0, 2) as Square,
      to: current.bestMoveUci.slice(2, 4) as Square,
      color: 'rgba(129, 182, 76, 0.85)',
    });
  }

  const comment = current ? coachComment(current) : 'Voici la revue de ta partie. Navigue avec les flèches !';

  return (
    <div className="review-layout">
      <div className="review-board-col">
        <div className="review-board-row">
          {settings.showEvalBar && <EvalBar cp={cp} flipped={flipped} />}
          <Chessboard
            fen={fen}
            orientation={flipped ? 'b' : 'w'}
            playableColor={null}
            onMove={() => {}}
            lastMove={current ? { from: current.uci.slice(0, 2) as Square, to: current.uci.slice(2, 4) as Square } : null}
            arrows={arrows}
          />
        </div>
        <div className="review-nav">
          <button onClick={() => setCursor(-1)} disabled={cursor < 0}>⏮</button>
          <button onClick={() => setCursor(Math.max(-1, cursor - 1))} disabled={cursor < 0}>◀</button>
          <button onClick={() => setCursor(Math.min(analysis.moves.length - 1, cursor + 1))} disabled={cursor >= analysis.moves.length - 1}>▶</button>
          <button onClick={() => setCursor(analysis.moves.length - 1)} disabled={cursor >= analysis.moves.length - 1}>⏭</button>
          <button onClick={() => setFlipped(!flipped)}>🔄</button>
          <button
            className="explore-btn"
            title="Explorer un autre coup depuis cette position"
            onClick={() => { setExploreFen(fen); setExploreFromMove(cursor >= 0 ? Math.floor(cursor / 2) + 1 : 0); }}
          >
            🔬 Et si ?
          </button>
        </div>
        <div className="coach-box">
          <NeoAvatar size={40} className="coach-face" />
          <p>{comment}</p>
          {settings.coachVoice && (
            <button title="Écouter" onClick={() => speak(comment)}>🔊</button>
          )}
        </div>
      </div>

      <div className="review-side-col">
        {summary && (
          <div className="panel review-summary">
            <h2 className="review-summary-title">📝 Bilan de la partie</h2>
            <p className="review-headline">{summary.headline}</p>
            {summary.paragraphs.map((p, i) => (
              <p key={i} className="review-para">{p}</p>
            ))}
            {summary.keyMoments.length > 0 && (
              <div className="key-moments">
                <h3>Moments-clés</h3>
                {summary.keyMoments.map((k, i) => (
                  <button key={i} className="key-moment" onClick={() => setCursor(k.cursor)}>
                    {k.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="panel accuracy-panel">
          <div className="accuracy-col">
            <span className="accuracy-value">{analysis.accuracy.w}</span>
            <span className="accuracy-label">Précision Blancs</span>
          </div>
          <div className="accuracy-col">
            <span className="accuracy-value">{analysis.accuracy.b}</span>
            <span className="accuracy-label">Précision Noirs</span>
          </div>
        </div>

        <EvalGraph analysis={analysis} cursor={cursor} onSeek={setCursor} />

        <div className="class-summary">
          {MOVE_CLASS_ORDER.map((cls: MoveClass) => {
            const total = analysis.counts.w[cls] + analysis.counts.b[cls];
            if (total === 0) return null;
            const info = MOVE_CLASS_INFO[cls];
            return (
              <div key={cls} className="class-line" title={info.blurb}>
                <MoveBadge cls={cls} size={20} />
                <span>{info.label}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-dim)' }}>
                  {analysis.counts.w[cls]} / {analysis.counts.b[cls]}
                </span>
              </div>
            );
          })}
        </div>

        <div className="review-movelist">
          {analysis.moves.map((m, i) => (
            <button
              key={i}
              className={`review-move ${cursor === i ? 'current' : ''}`}
              onClick={() => setCursor(i)}
            >
              <span className="review-move-num">{m.color === 'w' ? `${Math.floor(i / 2) + 1}.` : ''}</span>
              <span>{m.san}</span>
              <MoveBadge cls={m.classification} size={16} />
            </button>
          ))}
        </div>

        {current && current.bestLineSan.length > 0 && (
          <div className="panel best-line">
            <strong>Meilleure ligne :</strong> {current.bestLineSan.join(' ')}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ flex: 1 }} onClick={() => setView('report')}>← Bilan</button>
          <button style={{ flex: 1 }} onClick={onBack}>Autre partie</button>
        </div>
      </div>
    </div>
  );
}

function EvalGraph({ analysis, cursor, onSeek }: { analysis: GameAnalysis; cursor: number; onSeek: (i: number) => void }) {
  const W = 320, H = 80;
  const cps = [analysis.initialCp, ...analysis.moves.map((m) => m.cpAfter)];
  const points = cps.map((cp, i) => {
    const x = (i / Math.max(1, cps.length - 1)) * W;
    const clamped = Math.max(-800, Math.min(800, cp));
    const y = H / 2 - (clamped / 800) * (H / 2);
    return { x, y };
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const cursorX = ((cursor + 1) / Math.max(1, cps.length - 1)) * W;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="eval-graph"
      preserveAspectRatio="none"
      onClick={(e) => {
        const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
        const frac = (e.clientX - rect.left) / rect.width;
        const idx = Math.round(frac * (cps.length - 1)) - 1;
        onSeek(Math.max(-1, Math.min(analysis.moves.length - 1, idx)));
      }}
    >
      <rect x={0} y={0} width={W} height={H} fill="#2b2926" />
      <path d={`${path} L${W},${H / 2} L0,${H / 2} Z`} fill="rgba(245,245,245,0.85)" transform={`translate(0,0)`} clipPath="url(#topHalf)" />
      <path d={`M0,${H / 2} L${W},${H / 2}`} stroke="#666" strokeWidth={0.5} />
      <path d={path} fill="none" stroke="#81b64c" strokeWidth={1.5} />
      <line x1={cursorX} y1={0} x2={cursorX} y2={H} stroke="#e8a33d" strokeWidth={1.5} />
    </svg>
  );
}

// ---------------------------------------------------------------- Plateau libre

function FreeBoard({ startFen, onBack }: { startFen?: string; onBack: () => void }) {
  const settings = useSettings();
  const chessRef = useRef(new Chess(startFen));
  const [fen, setFen] = useState(chessRef.current.fen());
  const [flipped, setFlipped] = useState(false);
  const [cp, setCp] = useState(0);
  const [lines, setLines] = useState<{ san: string[]; cp: number }[]>([]);
  const [fenInput, setFenInput] = useState('');
  const engineRef = useRef<Engine | null>(null);

  useEffect(() => {
    const engine = new Engine();
    engineRef.current = engine;
    engine.setOptions({ UCI_LimitStrength: false, 'Skill Level': 20 });
    return () => engine.dispose();
  }, []);

  // Éval continue de la position courante
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    let stale = false;
    const chess = new Chess(fen);
    if (chess.isGameOver()) {
      setCp(chess.isCheckmate() ? (chess.turn() === 'w' ? -10000 : 10000) : 0);
      setLines([]);
      return;
    }
    engine.search(fen, { depth: 14, multipv: 3 }).then(({ candidates }) => {
      if (stale) return;
      const turn = fen.split(' ')[1] as 'w' | 'b';
      // Garde la ligne la plus profonde par index multipv
      const bestByIndex = candidates.slice(-3);
      if (bestByIndex.length) setCp(evalToWhiteCp(bestByIndex[0].eval, turn));
      setLines(
        bestByIndex.map((c) => {
          const lineChess = new Chess(fen);
          const sans: string[] = [];
          try {
            for (const u of c.pv.slice(0, 6)) {
              sans.push(lineChess.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? (u[4] as 'q') : undefined }).san);
            }
          } catch { /* ligne tronquée */ }
          return { san: sans, cp: evalToWhiteCp(c.eval, turn) };
        })
      );
    });
    return () => { stale = true; };
  }, [fen]);

  const bestArrow: Arrow[] = useMemo(() => {
    if (!lines.length || !lines[0].san.length) return [];
    try {
      const chess = new Chess(fen);
      const m = chess.move(lines[0].san[0]);
      return [{ from: m.from, to: m.to, color: 'rgba(129, 182, 76, 0.75)' }];
    } catch {
      return [];
    }
  }, [lines, fen]);

  return (
    <div className="review-layout">
      <div className="review-board-col">
        <div className="review-board-row">
          {settings.showEvalBar && <EvalBar cp={cp} flipped={flipped} />}
          <Chessboard
            fen={fen}
            orientation={flipped ? 'b' : 'w'}
            playableColor="both"
            onMove={(m) => {
              try {
                chessRef.current.move({ from: m.from, to: m.to, promotion: m.promotion });
                setFen(chessRef.current.fen());
              } catch { /* coup illégal */ }
            }}
            arrows={bestArrow}
          />
        </div>
        <div className="review-nav">
          <button onClick={() => { chessRef.current.undo(); setFen(chessRef.current.fen()); }}>↩ Annuler</button>
          <button onClick={() => { chessRef.current = new Chess(); setFen(chessRef.current.fen()); }}>♟ Départ</button>
          <button onClick={() => setFlipped(!flipped)}>🔄</button>
          <button onClick={() => navigator.clipboard.writeText(chessRef.current.fen())}>📋 FEN</button>
          <button onClick={() => navigator.clipboard.writeText(chessRef.current.pgn())}>📋 PGN</button>
        </div>
        <form
          className="fen-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (validateFen(fenInput.trim()).ok) {
              chessRef.current = new Chess(fenInput.trim());
              setFen(chessRef.current.fen());
              setFenInput('');
            }
          }}
        >
          <input placeholder="Charger un FEN…" value={fenInput} onChange={(e) => setFenInput(e.target.value)} />
          <button type="submit">Charger</button>
        </form>
      </div>
      <div className="review-side-col">
        <div className="panel">
          <h3 style={{ marginBottom: 8 }}>Lignes du moteur</h3>
          {lines.length === 0 && <p style={{ color: 'var(--text-dim)' }}>Calcul…</p>}
          {lines.map((l, i) => (
            <div key={i} className="engine-line">
              <span className="engine-line-eval">{l.cp >= 9000 ? '+M' : l.cp <= -9000 ? '-M' : (l.cp / 100).toFixed(1)}</span>
              <span>{l.san.join(' ')}</span>
            </div>
          ))}
        </div>
        <button onClick={onBack}>← Retour</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------ Scénario alternatif

/**
 * Bac à sable « Et si ? » : rejoue librement depuis une position de la partie
 * pour explorer d'autres scénarios, avec les suggestions du moteur en direct.
 */
function ExploreBoard({
  startFen,
  fromMoveNo,
  orientation,
  onClose,
}: {
  startFen: string;
  fromMoveNo: number;
  orientation: 'w' | 'b';
  onClose: () => void;
}) {
  const settings = useSettings();
  const chessRef = useRef(new Chess(startFen));
  const [fen, setFen] = useState(startFen);
  const [cp, setCp] = useState(0);
  const [lines, setLines] = useState<{ san: string[]; cp: number }[]>([]);
  const [moved, setMoved] = useState(false);
  const engineRef = useRef<Engine | null>(null);

  useEffect(() => {
    const engine = new Engine();
    engineRef.current = engine;
    engine.setOptions({ UCI_LimitStrength: false, 'Skill Level': 20 });
    return () => engine.dispose();
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    let stale = false;
    const chess = new Chess(fen);
    if (chess.isGameOver()) {
      setCp(chess.isCheckmate() ? (chess.turn() === 'w' ? -10000 : 10000) : 0);
      setLines([]);
      return;
    }
    engine.search(fen, { depth: 14, multipv: 3 }).then(({ candidates }) => {
      if (stale) return;
      const turn = fen.split(' ')[1] as 'w' | 'b';
      const best = candidates.slice(-3);
      if (best.length) setCp(evalToWhiteCp(best[0].eval, turn));
      setLines(
        best.map((c) => {
          const lineChess = new Chess(fen);
          const sans: string[] = [];
          try {
            for (const u of c.pv.slice(0, 6)) {
              sans.push(lineChess.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? (u[4] as 'q') : undefined }).san);
            }
          } catch { /* ligne tronquée */ }
          return { san: sans, cp: evalToWhiteCp(c.eval, turn) };
        })
      );
    });
    return () => { stale = true; };
  }, [fen]);

  const bestArrow: Arrow[] = useMemo(() => {
    if (!lines.length || !lines[0].san.length) return [];
    try {
      const chess = new Chess(fen);
      const m = chess.move(lines[0].san[0]);
      return [{ from: m.from, to: m.to, color: 'rgba(129, 182, 76, 0.75)' }];
    } catch {
      return [];
    }
  }, [lines, fen]);

  const reset = () => {
    chessRef.current = new Chess(startFen);
    setFen(startFen);
    setMoved(false);
  };

  return (
    <div className="review-layout">
      <div className="review-board-col">
        <div className="explore-banner">
          🔬 Scénario alternatif {fromMoveNo > 0 ? `depuis le coup ${fromMoveNo}` : 'depuis le début'} — joue les
          deux camps pour tester « et si… ? ». Ça ne modifie pas ta vraie partie.
        </div>
        <div className="review-board-row">
          {settings.showEvalBar && <EvalBar cp={cp} flipped={orientation === 'b'} />}
          <Chessboard
            fen={fen}
            orientation={orientation}
            playableColor="both"
            onMove={(m) => {
              try {
                chessRef.current.move({ from: m.from, to: m.to, promotion: m.promotion });
                setFen(chessRef.current.fen());
                setMoved(true);
              } catch { /* coup illégal */ }
            }}
            arrows={bestArrow}
          />
        </div>
        <div className="review-nav">
          <button onClick={() => { chessRef.current.undo(); setFen(chessRef.current.fen()); }} disabled={!moved}>↩ Annuler</button>
          <button onClick={reset} disabled={!moved}>⟲ Reprendre le scénario</button>
          <button className="primary" onClick={onClose}>← Revenir à la revue</button>
        </div>
      </div>
      <div className="review-side-col">
        <div className="panel">
          <h3 style={{ marginBottom: 8 }}>Suggestions du moteur</h3>
          {lines.length === 0 && <p style={{ color: 'var(--text-dim)' }}>Calcul…</p>}
          {lines.map((l, i) => (
            <div key={i} className="engine-line">
              <span className="engine-line-eval">{l.cp >= 9000 ? '+M' : l.cp <= -9000 ? '-M' : (l.cp / 100).toFixed(1)}</span>
              <span>{l.san.join(' ')}</span>
            </div>
          ))}
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          Astuce : joue le coup que tu aurais aimé faire, puis regarde comment le moteur répond.
        </p>
        <button onClick={onClose}>← Revenir à la revue</button>
      </div>
    </div>
  );
}
