import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess, type Color, type Square } from 'chess.js';
import Chessboard, { type Arrow, type BoardMove } from '../components/board/Chessboard';
import { GameOverModal, MoveList, NavButtons, PlayerBar } from '../components/GamePanel';
import TimeControlPicker from '../components/TimeControlPicker';
import OpeningLabel from '../components/OpeningLabel';
import { TIME_CONTROLS, type TimeControl } from '../game/timeControls';
import { useChessGame } from '../game/useChessGame';
import { Engine, evalToWhiteCp } from '../engine/engine';
import { configureEngineForBot, pickBotMove, botThinkDelay } from '../bots/bots';
import {
  NEO_LEVELS, getNeoLevel, type NeoLevel,
  classifyLoss, warnThreshold, neoStart, neoPraise, neoNudge, neoWarn,
  neoAfterOwnMove, neoBoardHint, neoAdvice, neoEnd,
} from '../mascot/neoGame';
import GameSheet from '../components/GameSheet';
import NeoRankEmblem from '../components/NeoRankEmblem';
import { NEO } from '../mascot/neo';
import { useProfile } from '../store/profile';
import { saveGameToHistory } from '../store/gameHistory';
import { playSound } from '../audio/sounds';
import { speak } from '../coach/voice';
import './playNeo.css';

interface NeoConfig {
  level: NeoLevel;
  playerColor: Color;
  tc: TimeControl;
}

export default function PlayNeo() {
  const [config, setConfig] = useState<NeoConfig | null>(null);
  const [gameKey, setGameKey] = useState(0);

  if (!config) {
    return <NeoSetup onStart={(c) => { setConfig(c); setGameKey((k) => k + 1); }} />;
  }
  return (
    <NeoGame
      key={gameKey}
      config={config}
      onExit={() => setConfig(null)}
      onRematch={() => setGameKey((k) => k + 1)}
    />
  );
}

// ---------------------------------------------------------------------------
// Écran de configuration : choix du niveau/style de Néo, couleur, cadence.
// ---------------------------------------------------------------------------
function NeoSetup({ onStart }: { onStart: (c: NeoConfig) => void }) {
  const [levelId, setLevelId] = useState<string>('neo-apprenti');
  const [colorChoice, setColorChoice] = useState<'w' | 'b' | 'random'>('w');
  const [tc, setTc] = useState<TimeControl>(TIME_CONTROLS.find((t) => t.id === '10+0')!);
  const level = getNeoLevel(levelId)!;

  return (
    <div className="neo-setup">
      <div className="neo-setup-hero">
        <div className="neo-hero-avatar">
          <img src={NEO.avatar} alt="Néo" />
          <span className="neo-hero-spark">⚡</span>
        </div>
        <div>
          <h1>Jouer contre <span className="gold-text">Néo</span></h1>
          <p>
            Une partie <strong>guidée</strong> par ton cavalier coach. Néo joue contre toi,
            te prévient avant les gaffes, félicite tes trouvailles et te souffle un plan
            quand tu le demandes. Le mode le plus <em>éducatif</em> de NC.chess.
          </p>
        </div>
      </div>

      <h3 className="neo-section-title">Choisis ton Néo</h3>
      <div className="neo-level-grid">
        {NEO_LEVELS.map((l) => (
          <button
            key={l.id}
            className={`neo-level-card ${levelId === l.id ? 'selected' : ''}`}
            onClick={() => setLevelId(l.id)}
          >
            <span className="neo-level-avatar"><NeoRankEmblem levelId={l.id} size={62} /></span>
            <span className="neo-level-name">{l.name}</span>
            <span className="neo-level-elo">{l.elo} Elo</span>
            <span className="neo-level-style">{l.style}</span>
          </button>
        ))}
      </div>

      <div className="panel neo-level-detail">
        <span className="neo-level-detail-avatar"><NeoRankEmblem levelId={level.id} size={54} /></span>
        <div>
          <h3 style={{ margin: 0 }}>
            {level.name} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({level.elo})</span>
          </h3>
          <p style={{ margin: '4px 0 0', color: 'var(--text-dim)' }}>{level.teaching}</p>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <h3>Ta couleur</h3>
        <div className="color-picker">
          <button className={colorChoice === 'w' ? 'selected' : ''} onClick={() => setColorChoice('w')}>♔ Blancs</button>
          <button className={colorChoice === 'random' ? 'selected' : ''} onClick={() => setColorChoice('random')}>🎲 Aléatoire</button>
          <button className={colorChoice === 'b' ? 'selected' : ''} onClick={() => setColorChoice('b')}>♚ Noirs</button>
        </div>
        <h3 style={{ marginTop: 16 }}>Cadence</h3>
        <p style={{ margin: '0 0 10px', color: 'var(--text-dim)', fontSize: 13 }}>
          10 minutes laissent le temps d’écouter Néo. Passe <strong>sans pendule</strong>
          {' '}si tu veux réfléchir sans aucune contrainte.
        </p>
        <TimeControlPicker value={tc} onChange={setTc} />
      </div>

      <button
        className="primary neo-start-btn"
        onClick={() =>
          onStart({
            level,
            playerColor: colorChoice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorChoice,
            tc,
          })
        }
      >
        ⚡ Défier {level.name}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aides matérielles pour expliquer une gaffe (« laisse ta dame en prise »).
// SEE minimaliste : reprend toujours avec la pièce la moins chère.
// ---------------------------------------------------------------------------
const SEE_VAL: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
const PIECE_FR: Record<string, string> = { p: 'un pion', n: 'un cavalier', b: 'un fou', r: 'une tour', q: 'la dame', k: 'le roi' };

function resolveExchange(chess: Chess, to: string): number {
  const caps = chess.moves({ verbose: true }).filter((m) => m.to === to && m.captured);
  if (caps.length === 0) return 0;
  caps.sort((a, b) => SEE_VAL[a.piece] - SEE_VAL[b.piece]);
  const rc = caps[0];
  const captured = SEE_VAL[rc.captured as string];
  chess.move({ from: rc.from, to: rc.to, promotion: rc.promotion });
  const val = Math.max(0, captured - resolveExchange(chess, to));
  chess.undo();
  return val;
}

// Après le coup du joueur, y a-t-il une pièce clairement en prise pour Néo ?
// Retourne le type de la meilleure pièce à gober (gain net ≥ mineure), sinon null.
function hangingPiece(fenAfter: string): string | null {
  const chess = new Chess(fenAfter);
  let best: string | null = null;
  let bestGain = 200; // ≥ ~deux pions pour éviter le bruit
  for (const m of chess.moves({ verbose: true })) {
    if (!m.captured) continue;
    const target = chess.get(m.to);
    if (!target) continue;
    const c = new Chess(fenAfter);
    c.move({ from: m.from, to: m.to, promotion: m.promotion });
    const gain = SEE_VAL[target.type] - resolveExchange(c, m.to);
    if (gain > bestGain) { bestGain = gain; best = target.type; }
  }
  return best;
}

function uciToSan(fen: string, uci: string): string | null {
  try {
    const c = new Chess(fen);
    const move = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
    return move.san;
  } catch {
    return null;
  }
}

const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
function pieceCount(fen: string): number {
  let n = 0;
  for (const ch of fen.split(' ')[0]) if (PIECE_VALUE[ch.toLowerCase()] || ch.toLowerCase() === 'k') n++;
  return n;
}

interface CoachMsg { text: string; tone: 'neutral' | 'success' | 'warn' | 'hint'; }
interface Warning { text: string; cls: 'mistake' | 'blunder'; }

// ---------------------------------------------------------------------------
// La partie contre Néo, avec coaching en direct.
// ---------------------------------------------------------------------------
function NeoGame({ config, onExit, onRematch }: { config: NeoConfig; onExit: () => void; onRematch: () => void; }) {
  const navigate = useNavigate();
  const profile = useProfile();
  const { level, playerColor, tc } = config;
  const botColor: Color = playerColor === 'w' ? 'b' : 'w';

  const botEngineRef = useRef<Engine | null>(null);
  const coachEngineRef = useRef<Engine | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [botThinking, setBotThinking] = useState(false);
  const [coachBusy, setCoachBusy] = useState(false); // analyse du coup du joueur en cours
  const [hintArrow, setHintArrow] = useState<Arrow[]>([]);
  const [coach, setCoach] = useState<CoachMsg>({ text: '', tone: 'neutral' });
  const [warning, setWarning] = useState<Warning | null>(null);
  const [thinkingLabel, setThinkingLabel] = useState(false);
  const [modalDismissed, setModalDismissed] = useState(false);
  const [adviceLoading, setAdviceLoading] = useState(false);

  const fenBeforeRef = useRef<string>('');
  const reviewedPlyRef = useRef(-1);
  const recordedRef = useRef(false);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReactRef = useRef(-10);

  // Affiche une réplique de Néo. `sticky` reste jusqu'au prochain message,
  // sinon elle s'efface toute seule. Lecture vocale optionnelle.
  const talk = useCallback((text: string, tone: CoachMsg['tone'] = 'neutral', sticky = false, voice = false) => {
    setCoach({ text, tone });
    if (voice) speak(text);
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    if (!sticky) clearTimerRef.current = setTimeout(() => setCoach((c) => (c.text === text ? { text: '', tone: 'neutral' } : c)), 6000);
  }, []);

  useEffect(() => () => { if (clearTimerRef.current) clearTimeout(clearTimerRef.current); }, []);

  const game = useChessGame({
    timeControl: tc,
    onGameEnd: (result) => {
      if (recordedRef.current) return;
      recordedRef.current = true;
      const outcome = result.winner === null ? 'draw' : result.winner === playerColor ? 'win' : 'loss';
      playSound(outcome === 'win' ? 'Victory' : outcome === 'loss' ? 'Defeat' : 'Draw');
      talk(neoEnd(outcome), outcome === 'loss' ? 'warn' : 'success', true, true);
      saveGameToHistory({
        mode: 'neo',
        white: playerColor === 'w' ? profile.pseudo : level.name,
        black: playerColor === 'b' ? profile.pseudo : level.name,
        pgn: game.chessRef.current.pgn(),
        timeControl: tc.id,
        result: result.winner === null ? '1/2-1/2' : result.winner === 'w' ? '1-0' : '0-1',
      });
    },
  });

  // Initialisation des deux moteurs : celui de Néo (bridé au niveau) et celui
  // du coach (pleine force, pour analyser tes coups et donner des indices).
  useEffect(() => {
    const botEngine = new Engine();
    const coachEngine = new Engine();
    botEngineRef.current = botEngine;
    coachEngineRef.current = coachEngine;
    let cancelled = false;
    Promise.all([
      configureEngineForBot(botEngine, level.bot),
      coachEngine.setOptions({ UCI_LimitStrength: false, 'Skill Level': 20 }),
    ]).then(() => { if (!cancelled) setEngineReady(true); });
    return () => {
      cancelled = true;
      botEngine.dispose();
      coachEngine.dispose();
      botEngineRef.current = null;
      coachEngineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Salutation d'ouverture.
  useEffect(() => {
    if (engineReady && game.history.length === 0 && !game.result) talk(neoStart(level, playerColor), 'neutral', true, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineReady]);

  // Efface l'indice fléché dès qu'un coup est joué.
  useEffect(() => setHintArrow([]), [game.fen]);

  // ---- Analyse du coup du joueur (le cœur du mode guidé) ----
  const reviewPlayerMove = useCallback(async (fenBefore: string, fenAfter: string) => {
    const coachEngine = coachEngineRef.current;
    if (!coachEngine) return;
    const before = await coachEngine.search(fenBefore, { depth: 12, movetime: 700 });
    const after = await coachEngine.search(fenAfter, { depth: 12, movetime: 700 });
    const whiteBefore = before.candidates.length ? evalToWhiteCp(before.candidates[0].eval, playerColor) : 0;
    const whiteAfter = after.candidates.length ? evalToWhiteCp(after.candidates[0].eval, botColor) : 0;
    const cpBefore = playerColor === 'w' ? whiteBefore : -whiteBefore;
    const cpAfter = playerColor === 'w' ? whiteAfter : -whiteAfter;
    const cpLoss = Math.max(0, cpBefore - cpAfter);
    const cls = classifyLoss(cpLoss);

    if ((cls === 'mistake' || cls === 'blunder') && cpLoss >= warnThreshold(level.guidance)) {
      // Interruption pédagogique : on explique et on propose de reprendre.
      const hang = hangingPiece(fenAfter);
      const reason = hang ? `laisse ${PIECE_FR[hang]} en prise` : undefined;
      const better = before.best ? uciToSan(fenBefore, before.best) : null;
      const text = neoWarn(cls, reason, better ?? undefined);
      setWarning({ text, cls });
      talk(text, 'warn', true, true);
      return; // Néo attend ta décision : il ne joue pas.
    }

    // Pas d'interruption : petit retour selon la qualité du coup.
    if (level.guidance !== 'off') {
      if (cls === 'best') talk(neoPraise('best'), 'success');
      else if (cls === 'good' && Math.random() < 0.5) talk(neoPraise('good'), 'success');
      else if (cls === 'inaccuracy' && level.guidance === 'full') talk(neoNudge(), 'warn');
    }
    setCoachBusy(false);
  }, [playerColor, botColor, level.guidance, talk]);

  // Coup du joueur : on capture la position AVANT, on joue, puis on analyse.
  const handlePlayerMove = useCallback((m: BoardMove) => {
    if (game.turn !== playerColor || game.result) return;
    const fenBefore = game.fen;
    const move = game.makeMove(m);
    if (!move) return;
    fenBeforeRef.current = fenBefore;
    reviewedPlyRef.current = game.history.length + 1;
    if (level.guidance === 'off') return; // aucun accompagnement : Néo répond direct
    setCoachBusy(true);
    reviewPlayerMove(fenBefore, game.chessRef.current.fen());
  }, [game, playerColor, level.guidance, reviewPlayerMove]);

  // ---- Tour de Néo ----
  const thinkingRef = useRef(false);
  useEffect(() => {
    if (!engineReady || game.result || game.turn !== botColor || thinkingRef.current) return;
    if (coachBusy || warning) return; // Néo attend la fin de l'analyse / ta décision
    const engine = botEngineRef.current;
    if (!engine) return;
    thinkingRef.current = true;
    setBotThinking(true);
    setThinkingLabel(true);
    const fen = game.fen;
    Promise.all([
      pickBotMove(engine, level.bot, fen),
      new Promise((r) =>
        setTimeout(
          r,
          botThinkDelay(level.bot, {
            fen,
            remainingMs: game.clock?.[botColor],
            incrementMs: tc.increment * 1000,
            ply: game.history.length,
          })
        )
      ),
    ])
      .then(([uci]) => {
        thinkingRef.current = false;
        setBotThinking(false);
        setThinkingLabel(false);
        if (game.chessRef.current.fen() === fen && !game.result) {
          game.applySanOrUci(uci as string);
        }
      })
      .catch(() => { thinkingRef.current = false; setBotThinking(false); setThinkingLabel(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineReady, game.fen, game.result, game.turn, botColor, coachBusy, warning]);

  // Réaction de Néo à son propre coup (bavardage léger, non intrusif).
  useEffect(() => {
    const h = game.history;
    if (h.length === 0 || game.result) return;
    const last = h[h.length - 1];
    if (last.color !== botColor) return;
    const ply = h.length;
    if (ply - lastReactRef.current < 3) return;
    const inCheck = game.chessRef.current.inCheck();
    let kind: 'check' | 'capture' | 'advantage' | 'normal' | null = null;
    if (inCheck) kind = Math.random() < 0.7 ? 'check' : null;
    else if (last.captured) kind = Math.random() < 0.4 ? 'capture' : null;
    if (kind) { lastReactRef.current = ply; talk(neoAfterOwnMove(kind), 'neutral'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.history.length]);

  // ---- Décisions sur l'avertissement ----
  const keepMove = useCallback(() => {
    setWarning(null);
    setCoachBusy(false); // Néo peut jouer
  }, []);
  const undoMove = useCallback(() => {
    setWarning(null);
    setCoachBusy(false);
    game.undo(1);
    talk('Bien vu, on reprend. Prends ton temps. 👌', 'neutral');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  // ---- Conseils à la demande ----
  const boardHint = useCallback(async () => {
    const coachEngine = coachEngineRef.current;
    if (!coachEngine || game.turn !== playerColor || game.result) return;
    setAdviceLoading(true);
    const { best } = await coachEngine.search(game.fen, { depth: 14, movetime: 1200 });
    setAdviceLoading(false);
    if (best && best.length >= 4) {
      setHintArrow([{ from: best.slice(0, 2) as Square, to: best.slice(2, 4) as Square, color: 'rgba(212, 175, 55, 0.9)' }]);
      talk(neoBoardHint(), 'hint');
    }
  }, [game.fen, game.turn, game.result, playerColor, talk]);

  const askAdvice = useCallback(async () => {
    const coachEngine = coachEngineRef.current;
    if (!coachEngine || game.result) return;
    setAdviceLoading(true);
    const { candidates } = await coachEngine.search(game.fen, { depth: 12, movetime: 900 });
    setAdviceLoading(false);
    const whiteCp = candidates.length ? evalToWhiteCp(candidates[0].eval, game.turn) : 0;
    const cp = playerColor === 'w' ? whiteCp : -whiteCp;
    const text = neoAdvice({
      cp,
      inCheck: game.chessRef.current.inCheck(),
      moveCount: game.history.length,
      pieceCount: pieceCount(game.fen),
    });
    talk(text, 'hint', true, true);
  }, [game, playerColor, talk]);

  const takeBack = useCallback(() => {
    if (game.history.length === 0 || game.result) return;
    const count = game.turn === playerColor ? 2 : 1;
    game.undo(Math.min(count, game.history.length));
  }, [game, playerColor]);

  const isLive = game.viewIndex < 0;
  const canAct = isLive && !game.result && !warning;

  const subtitle = useMemo(() => {
    if (thinkingLabel) return 'réfléchit…';
    if (coachBusy) return 'observe ton coup…';
    return level.style;
  }, [thinkingLabel, coachBusy, level.style]);

  return (
    <div className="game-layout neo-game">
      <div className="game-board-col">
        <PlayerBar
          name={level.name}
          rating={level.elo}
          avatar={NEO.emoji}
          color={botColor}
          history={game.history}
          clockMs={game.clock?.[botColor]}
          clockActive={game.clockRunning && game.turn === botColor && !game.result}
          subtitle={subtitle}
        />
        <div className="game-board-fit">
          <Chessboard
            fen={game.viewFen}
            orientation={playerColor}
            playableColor={canAct ? playerColor : null}
            onMove={handlePlayerMove}
            lastMove={game.lastMove}
            arrows={hintArrow}
          />
        </div>
        <PlayerBar
          name={profile.pseudo}
          rating={null}
          avatar={profile.avatar}
          color={playerColor}
          history={game.history}
          clockMs={game.clock?.[playerColor]}
          clockActive={game.clockRunning && game.turn === playerColor && !game.result}
        />
      </div>

      <div className="game-side-col">
        {!engineReady && <div className="neo-loading">Néo se prépare… ⚡</div>}

        {/* Boîte de dialogue de Néo : sa présence permanente. */}
        <div className={`neo-coach-card ${coach.tone}`}>
          <div className="neo-coach-avatar">
            <NeoRankEmblem levelId={level.id} size={44} />
            {(botThinking || coachBusy || adviceLoading) && <span className="neo-coach-dots"><i /><i /><i /></span>}
          </div>
          <div className="neo-coach-body">
            <span className="neo-coach-name">Néo <span className="neo-coach-lvl">· {level.name}</span></span>
            {coach.text
              ? <p className="neo-coach-text" key={coach.text}>{coach.text}</p>
              : <p className="neo-coach-text neo-coach-idle">Je t’observe… demande-moi un conseil quand tu veux. ⚡</p>}
          </div>
        </div>

        {/* Conseils à la demande */}
        {!game.result && (
          <div className="neo-advice-row">
            <button onClick={boardHint} disabled={!canAct || game.turn !== playerColor || adviceLoading}>
              💡 Indice sur l’échiquier
            </button>
            <button onClick={askAdvice} disabled={game.result != null || adviceLoading}>
              💬 Demander un conseil
            </button>
          </div>
        )}

        {/* Sur mobile : rangé dans un tiroir pour laisser l'écran à l'échiquier.
            Sur grand écran : affiché directement dans la colonne. */}
        <GameSheet label={game.result ? 'Partie terminée' : 'Coups & options'}>
          <OpeningLabel history={game.history} />
          <MoveList history={game.history} viewIndex={game.viewIndex} onSelect={game.goTo} />
          <NavButtons historyLength={game.history.length} viewIndex={game.viewIndex} onGoTo={game.goTo} />

          <div className="game-actions">
            {!game.result ? (
              <>
                <button onClick={takeBack} disabled={game.history.length === 0}>↩ Reprendre</button>
                <button className="danger" onClick={() => game.resign(playerColor)}>🏳 Abandon</button>
              </>
            ) : (
              <>
                <button className="primary" onClick={onRematch}>⚔️ Revanche</button>
                <button onClick={() => navigate('/analysis', { state: { pgn: game.chessRef.current.pgn() } })}>📊 Analyser</button>
                <button onClick={onExit}>Changer de niveau</button>
              </>
            )}
          </div>
        </GameSheet>
      </div>

      {/* Boîte de dialogue d'avertissement (mode guidé) */}
      {warning && (
        <div className="neo-warn-backdrop">
          <div className={`neo-warn ${warning.cls}`}>
            <div className="neo-warn-avatar"><img src={NEO.avatar} alt="Néo" /></div>
            <p className="neo-warn-text">{warning.text}</p>
            <div className="neo-warn-actions">
              <button className="primary" onClick={undoMove}>↩ Reprendre mon coup</button>
              <button onClick={keepMove}>Jouer quand même</button>
            </div>
          </div>
        </div>
      )}

      {game.result && !modalDismissed && (
        <GameOverModal
          result={game.result}
          playerColor={playerColor}
          whiteName={playerColor === 'w' ? profile.pseudo : level.name}
          blackName={playerColor === 'b' ? profile.pseudo : level.name}
          onClose={() => setModalDismissed(true)}
          onRematch={onRematch}
          onNewGame={onExit}
          onAnalyze={() => navigate('/analysis', { state: { pgn: game.chessRef.current.pgn() } })}
        />
      )}
    </div>
  );
}
