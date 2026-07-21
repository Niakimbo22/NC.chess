import { useCallback, useEffect, useRef, useState } from 'react';
import OpeningLabel from '../components/OpeningLabel';
import { useNavigate } from 'react-router-dom';
import type { Color, Square } from 'chess.js';
import Chessboard, { type Arrow } from '../components/board/Chessboard';
import { GameOverModal, MoveList, NavButtons, PlayerBar } from '../components/GamePanel';
import TimeControlPicker from '../components/TimeControlPicker';
import { TIME_CONTROLS, type TimeControl } from '../game/timeControls';
import { useChessGame } from '../game/useChessGame';
import { Engine, evalToWhiteCp } from '../engine/engine';
import { BOTS, configureEngineForBot, pickBotMove, botThinkDelay, type Bot } from '../bots/bots';
import { botLine, type ChatCategory } from '../bots/chatter';
import { useProfile } from '../store/profile';
import { saveGameToHistory } from '../store/gameHistory';
import { playSound } from '../audio/sounds';
import './playBot.css';

interface BotConfig {
  bot: Bot;
  playerColor: Color;
  tc: TimeControl;
  rated: boolean;
}

export default function PlayBot() {
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [gameKey, setGameKey] = useState(0);

  if (!config) {
    return <BotSetup onStart={(c) => { setConfig(c); setGameKey((k) => k + 1); }} />;
  }
  return (
    <BotGame
      key={gameKey}
      config={config}
      onExit={() => setConfig(null)}
      onRematch={() => setGameKey((k) => k + 1)}
    />
  );
}

function BotSetup({ onStart }: { onStart: (c: BotConfig) => void }) {
  const profile = useProfile();
  const [botId, setBotId] = useState<string>('tom');
  const [colorChoice, setColorChoice] = useState<'w' | 'b' | 'random'>('random');
  const [tc, setTc] = useState<TimeControl>(TIME_CONTROLS[0]);
  const [rated, setRated] = useState(true);

  const bot = BOTS.find((b) => b.id === botId)!;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1>🤖 Jouer contre une IA</h1>
      <p style={{ color: 'var(--text-dim)', marginTop: -6 }}>
        Ton Elo actuel : <strong style={{ color: 'var(--accent)' }}>{profile.elo}</strong> — choisis ton adversaire.
      </p>
      <div className="bot-grid">
        {BOTS.map((b) => (
          <button
            key={b.id}
            className={`bot-card ${botId === b.id ? 'selected' : ''}`}
            onClick={() => setBotId(b.id)}
          >
            <span className="bot-avatar">{b.avatar}</span>
            <span className="bot-name">{b.name}</span>
            <span className="bot-elo">{b.elo}</span>
          </button>
        ))}
      </div>
      <div className="panel" style={{ marginTop: 14 }}>
        <div className="bot-detail">
          <span className="bot-avatar-lg">{bot.avatar}</span>
          <div>
            <h3 style={{ margin: 0 }}>{bot.name} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({bot.elo})</span></h3>
            <p style={{ margin: '4px 0', color: 'var(--text-dim)' }}>{bot.description}</p>
            <p style={{ margin: 0, fontSize: 13 }}>Style : <em>{bot.style}</em></p>
          </div>
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
        <TimeControlPicker value={tc} onChange={setTc} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, cursor: 'pointer' }}>
          <input type="checkbox" checked={rated} onChange={(e) => setRated(e.target.checked)} />
          Partie classée (mon Elo évolue)
        </label>
      </div>
      <button
        className="primary"
        style={{ width: '100%', fontSize: 18, padding: 14, marginTop: 14 }}
        onClick={() =>
          onStart({
            bot,
            playerColor: colorChoice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorChoice,
            tc,
            rated,
          })
        }
      >
        Défier {bot.name}
      </button>
    </div>
  );
}

// Balance matérielle depuis un FEN (positif = les Blancs mènent), en points.
const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
function materialBalance(fen: string): number {
  let bal = 0;
  for (const ch of fen.split(' ')[0]) {
    const v = PIECE_VALUE[ch.toLowerCase()];
    if (v) bal += ch === ch.toLowerCase() ? -v : v;
  }
  return bal;
}

function BotGame({
  config,
  onExit,
  onRematch,
}: {
  config: BotConfig;
  onExit: () => void;
  onRematch: () => void;
}) {
  const navigate = useNavigate();
  const profile = useProfile();
  const { bot, playerColor, tc, rated } = config;
  const botColor: Color = playerColor === 'w' ? 'b' : 'w';

  const engineRef = useRef<Engine | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [botThinking, setBotThinking] = useState(false);
  const [hintArrow, setHintArrow] = useState<Arrow[]>([]);
  const [modalDismissed, setModalDismissed] = useState(false);
  const [eloChange, setEloChange] = useState<number | null>(null);
  const [botMessage, setBotMessage] = useState<string | null>(null);
  const recordedRef = useRef(false);
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSayPlyRef = useRef(-10);

  // Fait « parler » le bot : affiche une réplique qui s'efface toute seule.
  const say = useCallback((category: ChatCategory) => {
    const line = botLine(bot.id, category);
    if (!line) return;
    setBotMessage(line);
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setBotMessage(null), 4500);
  }, [bot.id]);

  useEffect(() => () => { if (msgTimerRef.current) clearTimeout(msgTimerRef.current); }, []);

  const game = useChessGame({
    timeControl: tc,
    onGameEnd: (result) => {
      if (recordedRef.current) return;
      recordedRef.current = true;
      const score: 0 | 0.5 | 1 = result.winner === null ? 0.5 : result.winner === playerColor ? 1 : 0;
      if (score === 1) playSound('Victory');
      else if (score === 0) playSound('Defeat');
      else playSound('Draw');
      let delta: number | null = null;
      if (rated) {
        delta = profile.recordRatedGame(bot.elo, score, tc.category);
        setEloChange(delta);
      }
      saveGameToHistory({
        mode: 'bot',
        white: playerColor === 'w' ? profile.pseudo : bot.name,
        black: playerColor === 'b' ? profile.pseudo : bot.name,
        pgn: game.chessRef.current.pgn(),
        timeControl: tc.id,
        result: result.winner === null ? '1/2-1/2' : result.winner === 'w' ? '1-0' : '0-1',
        botId: bot.id,
        playerEloAfter: rated ? profile.elo + (delta ?? 0) : undefined,
      });
    },
  });

  // Initialisation du moteur
  useEffect(() => {
    const engine = new Engine();
    engineRef.current = engine;
    let cancelled = false;
    configureEngineForBot(engine, bot).then(() => {
      if (!cancelled) setEngineReady(true);
    });
    return () => {
      cancelled = true;
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tour du bot
  const thinkingRef = useRef(false);
  useEffect(() => {
    if (!engineReady || game.result || game.turn !== botColor || thinkingRef.current) return;
    const engine = engineRef.current;
    if (!engine) return;
    thinkingRef.current = true;
    setBotThinking(true);
    const fen = game.fen;
    Promise.all([
      pickBotMove(engine, bot, fen),
      new Promise((r) => setTimeout(r, botThinkDelay(bot, game.clock?.[botColor], game.history.length))),
    ])
      .then(([uci]) => {
        thinkingRef.current = false;
        setBotThinking(false);
        // La position n'a pas changé entre-temps ?
        if (game.chessRef.current.fen() === fen && !game.result) {
          game.applySanOrUci(uci as string);
        }
      })
      .catch(() => {
        thinkingRef.current = false;
        setBotThinking(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineReady, game.fen, game.result, game.turn, botColor]);

  // Efface l'indice dès qu'un coup est joué
  useEffect(() => setHintArrow([]), [game.fen]);

  const showHint = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || game.turn !== playerColor || game.result) return;
    // L'indice utilise la pleine force quel que soit le bot
    await engine.setOptions({ UCI_LimitStrength: false, 'Skill Level': 20 });
    const { best } = await engine.search(game.fen, { depth: 14, movetime: 1200 });
    await configureEngineForBot(engine, bot);
    if (best && best.length >= 4) {
      setHintArrow([{ from: best.slice(0, 2) as Square, to: best.slice(2, 4) as Square, color: 'rgba(61, 159, 232, 0.85)' }]);
    }
  }, [game.fen, game.turn, game.result, playerColor, bot]);

  const offerDraw = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || game.result) return;
    const { candidates } = await engine.search(game.fen, { depth: 10, movetime: 500 });
    const cp = candidates.length ? evalToWhiteCp(candidates[0].eval, game.turn) : 0;
    const botCp = botColor === 'w' ? cp : -cp;
    if (botCp <= -120 || (Math.abs(botCp) <= 30 && game.history.length >= 50)) {
      game.agreeDraw();
    } else {
      setBotMessage(`${bot.name} refuse la nulle ! 😤`);
      setTimeout(() => setBotMessage(null), 3500);
    }
  }, [game, botColor, bot]);

  const takeBack = useCallback(() => {
    if (game.history.length === 0 || game.result) return;
    const count = game.turn === playerColor ? 2 : 1;
    game.undo(Math.min(count, game.history.length));
  }, [game, playerColor]);

  // Salutation en début de partie.
  useEffect(() => {
    if (engineReady && game.history.length === 0 && !game.result) say('start');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineReady]);

  // Réactions du bot au fil des coups (capture, échec, avantage, difficulté).
  useEffect(() => {
    const h = game.history;
    if (h.length === 0 || game.result) return;
    const last = h[h.length - 1];
    const ply = h.length;
    const inCheck = game.chessRef.current.inCheck();

    const maybe = (category: ChatCategory, prob: number) => {
      if (ply - lastSayPlyRef.current < 4) return; // pas de bavardage à chaque coup
      if (Math.random() > prob) return;
      lastSayPlyRef.current = ply;
      say(category);
    };

    if (last.color === botColor) {
      // Le bot vient de jouer.
      if (inCheck) maybe('check', 0.55);
      else if (last.captured) maybe('capture', 0.4);
      else {
        const botAhead = botColor === 'w' ? materialBalance(game.fen) : -materialBalance(game.fen);
        if (botAhead >= 3) maybe('advantage', 0.25);
      }
    } else {
      // Le joueur vient de jouer : le bot réagit s'il est bousculé.
      if (inCheck) maybe('trouble', 0.5); // joueur met le bot en échec
      else if (last.captured) maybe('trouble', 0.35); // joueur prend une pièce du bot
      else {
        const botBehind = botColor === 'w' ? -materialBalance(game.fen) : materialBalance(game.fen);
        if (botBehind >= 3) maybe('trouble', 0.2);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.history.length]);

  // Mot de la fin.
  useEffect(() => {
    if (!game.result) return;
    const category: ChatCategory =
      game.result.winner === null ? 'draw' : game.result.winner === botColor ? 'win' : 'loss';
    say(category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.result]);

  const isLive = game.viewIndex < 0;
  const playerName = profile.pseudo;

  return (
    <div className="game-layout">
      <div className="game-board-col">
        <div className="bot-speech-anchor">
          <PlayerBar
            name={bot.name}
            rating={bot.elo}
            avatar={bot.avatar}
            color={botColor}
            history={game.history}
            clockMs={game.clock?.[botColor]}
            clockActive={game.clockRunning && game.turn === botColor && !game.result}
            subtitle={botThinking ? 'réfléchit…' : undefined}
          />
          {botMessage && (
            <div className="bot-speech" key={botMessage}>
              <span className="bot-speech-avatar">{bot.avatar}</span>
              <span className="bot-speech-text">{botMessage}</span>
            </div>
          )}
        </div>
        <Chessboard
          fen={game.viewFen}
          orientation={playerColor}
          playableColor={isLive && !game.result ? playerColor : null}
          onMove={(m) => game.makeMove(m)}
          lastMove={game.lastMove}
          arrows={hintArrow}
        />
        <PlayerBar
          name={playerName}
          rating={rated ? profile.elo : null}
          avatar={profile.avatar}
          color={playerColor}
          history={game.history}
          clockMs={game.clock?.[playerColor]}
          clockActive={game.clockRunning && game.turn === playerColor && !game.result}
        />
      </div>
      <div className="game-side-col">
        {!engineReady && <div className="bot-message">Chargement du moteur… ⏳</div>}
        <OpeningLabel history={game.history} />
        <MoveList history={game.history} viewIndex={game.viewIndex} onSelect={game.goTo} />
        <NavButtons historyLength={game.history.length} viewIndex={game.viewIndex} onGoTo={game.goTo} />
        <div className="game-actions">
          {!game.result ? (
            <>
              <button onClick={showHint} disabled={game.turn !== playerColor}>💡 Indice</button>
              <button onClick={takeBack} disabled={game.history.length === 0}>↩ Reprendre</button>
              <button onClick={offerDraw}>½ Nulle</button>
              <button className="danger" onClick={() => game.resign(playerColor)}>🏳 Abandon</button>
            </>
          ) : (
            <>
              <button className="primary" onClick={onRematch}>⚔️ Revanche</button>
              <button onClick={() => navigate('/analysis', { state: { pgn: game.chessRef.current.pgn() } })}>📊 Analyser</button>
              <button onClick={onExit}>Changer de bot</button>
            </>
          )}
        </div>
      </div>
      {game.result && !modalDismissed && (
        <GameOverModal
          result={game.result}
          playerColor={playerColor}
          whiteName={playerColor === 'w' ? playerName : bot.name}
          blackName={playerColor === 'b' ? playerName : bot.name}
          eloChange={eloChange}
          onClose={() => setModalDismissed(true)}
          onRematch={onRematch}
          onNewGame={onExit}
          onAnalyze={() => navigate('/analysis', { state: { pgn: game.chessRef.current.pgn() } })}
        />
      )}
    </div>
  );
}
